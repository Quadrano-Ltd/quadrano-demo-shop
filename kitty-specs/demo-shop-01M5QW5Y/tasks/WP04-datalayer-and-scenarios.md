---
work_package_id: WP04
title: Data layer pushes and scenarios
dependencies:
- WP01
requirement_refs:
- FR-004
- FR-005
- FR-006
- FR-007
- FR-008
- FR-009
- FR-010
- FR-011
- FR-012
- FR-013
- FR-016
- FR-017
planning_base_branch: feat/demo-shop
merge_target_branch: feat/demo-shop
branch_strategy: Planning artifacts for this mission were generated on feat/demo-shop. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/demo-shop unless the human explicitly redirects the landing branch.
subtasks:
- T018
- T019
- T020
- T021
- T022
phase: Phase 2 - Foundational
history:
- at: '2026-10-24T21:50:34Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: site/src/datalayer/
create_intent:
- site/src/datalayer/events.ts
- site/src/datalayer/scenarios.ts
- site/src/datalayer/push.ts
- site/src/switcher/scenario-url.ts
- scripts/verify-scenarios.ts
execution_mode: code_change
model: ''
owned_files:
- site/src/datalayer/events.ts
- site/src/datalayer/scenarios.ts
- site/src/datalayer/push.ts
- site/src/switcher/scenario-url.ts
- scripts/verify-scenarios.ts
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP04 – Data layer pushes and scenarios

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

This WP is the heart of the demo: the exact objects the audience's Console verdicts are written about.

- `events.ts` builds the **correct** `add_to_cart` and `purchase` objects exactly as in `contracts/datalayer-pushes.md` (FR-004, FR-005). It also holds the single `TRANSACTION_ID_PATTERN` constant and `newTransactionId()` (R-06).
- `scenarios.ts` holds the six scenarios in talk-script order. Each broken one returns a **copy** of the correct `purchase` that differs in **exactly one way** (FR-007 to FR-012). None affects `add_to_cart`.
- `push.ts` is the **only** module that touches `window.dataLayer` (lint-enforced from WP01). Each action pushes `{ ecommerce: null }` then **one** event (FR-006, FR-016). It writes nothing to the Console (FR-017).
- `switcher/scenario-url.ts` parses and formats `?scenario=`, defaulting to `correct` (FR-013 support for WP05/WP06).
- `pnpm verify:scenarios` checks the contract invariants with `node:assert` and exits non-zero on any violation. It is proven able to fail.

## Context & Constraints

- **Acceptance source**: `kitty-specs/demo-shop-01M5QW5Y/contracts/datalayer-pushes.md`. The objects, key names, types and one-difference table are authoritative. `data-model.md` "Scenario" table gives ids, labels and order. `contracts/scenario-url.md` gives the link format.
- `research.md`: R-04 (scenario state in URL only), R-05 (scenario 2 literal `"12.99"`), R-06 (transaction ID), R-07 (pence → amount).
- **Provisional until the W2 freeze (Tue 27 Oct)**: Attribute names and the pattern may change in WP08 (FR-024). Keep every Attribute name and the pattern in **one place each** so the reconciliation is a few-line diff.
- **Node-importable**: `events.ts` and `scenarios.ts` are imported by `scripts/verify-scenarios.ts`, which Node runs directly. They must not touch `window` or `document` (at import **or** in their functions), must use `.ts` import extensions, and must use erasable syntax only (no `enum`). `push.ts` and `scenario-url.ts` may touch browser globals, but only inside functions, never at import time.
- **Independence from WP03**: do not import from `site/src/shop/`. Builders take a plain `PushLine` (structurally identical to WP03's `OrderLine`).
- **Never** produce verdict-like text (✓ ✗ ⚠, pass/fail/valid/invalid) anywhere in `site/` (FR-017; lint fails the build otherwise). Scenario **labels** must also avoid those words.
- Terminology: comments say "Attribute" for keys in pushed objects.

## Branch Strategy

- **Strategy**: Planning artifacts were generated on feat/demo-shop; completed changes must merge back into feat/demo-shop.
- **Planning base branch**: feat/demo-shop
- **Merge target branch**: feat/demo-shop
- Execution worktrees are allocated per computed lane from `lanes.json`; start with `spec-kitty agent action implement WP04 --agent claude`.

## Subtasks & Detailed Guidance

### Subtask T018 – `site/src/datalayer/events.ts`

- **Purpose**: Correct push objects and the shared constants.
- **Exports**:
  ```ts
  export interface PushLine { readonly itemId: string; readonly name: string; readonly pricePence: number; readonly quantity: number }

  export const CURRENCY = 'GBP';
  // Working pattern until the W2 freeze (FR-024). Change here only.
  export const TRANSACTION_ID_PATTERN = /^T-[0-9]{6}$/;

  export interface PushItem { item_id: string; item_name: string; price: number; quantity: number }
  export interface AddToCartPush { event: 'add_to_cart'; ecommerce: { currency: string; value: number; items: PushItem[] } }
  export interface PurchasePush  { event: 'purchase';    ecommerce: { transaction_id: string; currency: string; value: number; items: PushItem[] } }

  export function toAmount(pence: number): number;          // integer pence → number with ≤ 2 decimals: pence / 100
  export function newTransactionId(): string;               // 'T-' + 6 digits from crypto.getRandomValues, zero-padded
  export function buildAddToCart(line: PushLine): AddToCartPush;
  export function buildPurchase(input: { transactionId: string; lines: readonly PushLine[] }): PurchasePush;
  ```
- **Rules**:
  - `toAmount`: throw (programming error) if `!Number.isInteger(pence)`. `pence / 100` of an integer gives the nearest double, which prints as `12.99`. Sum in pence **first**, divide **once**, so `value` never reads `12.990000001` (R-07).
  - `buildAddToCart`: `value = toAmount(pricePence × quantity)`; `items` has exactly the one line; `price = toAmount(pricePence)`; `quantity` an integer.
  - `buildPurchase`: `value = toAmount(Σ pricePence × quantity)`; `items` in line order. **Key order** matches the contract (`transaction_id, currency, value, items`; items `item_id, item_name, price, quantity`). The Console doesn't care, but GTM Preview reads better and diffs are easier.
  - `newTransactionId`: `globalThis.crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000`, padded to 6 digits. The result **must** match `TRANSACTION_ID_PATTERN`. `globalThis.crypto` exists in browsers and Node 24.
  - Objects contain **only** `event` and `ecommerce` at the top level (contract invariant).
- **Example** (hero product, quantity 1):
  ```js
  buildPurchase({ transactionId: 'T-104233', lines: [{ itemId: 'SKU-1001', name: 'Stoneware Mug', pricePence: 1299, quantity: 1 }] })
  // → { event: 'purchase', ecommerce: { transaction_id: 'T-104233', currency: 'GBP', value: 12.99,
  //      items: [{ item_id: 'SKU-1001', item_name: 'Stoneware Mug', price: 12.99, quantity: 1 }] } }
  ```

### Subtask T019 – `site/src/datalayer/scenarios.ts`

- **Purpose**: The scenario registry (data-model "Scenario").
- **Exports**:
  ```ts
  export const SCENARIO_IDS = ['correct', 'missing-value', 'value-as-text', 'wrong-case-key', 'lowercase-currency', 'bad-transaction-id'] as const;
  export type ScenarioId = (typeof SCENARIO_IDS)[number];
  export const DEFAULT_SCENARIO_ID: ScenarioId = 'correct';

  export interface Scenario {
    readonly id: ScenarioId;
    readonly label: string;       // shown in the switcher; no verdict wording
    readonly order: number;       // talk-script position
    readonly talkScript: boolean; // false only for the spare
    readonly apply: (correct: Readonly<PurchasePush>) => Record<string, unknown>; // returns a NEW object; never mutates input
  }
  export const SCENARIOS: readonly Scenario[];   // sorted by order
  export function isScenarioId(v: unknown): v is ScenarioId;
  export function getScenario(id: ScenarioId): Scenario;
  ```
- **The table to implement** (verbatim labels from data-model.md):
  | order | id | label | apply |
  |---|---|---|---|
  | 0 | `correct` | `Correct` | deep copy, unchanged |
  | 1 | `missing-value` | `1 · Missing value` | copy, then delete `ecommerce.value` |
  | 2 | `value-as-text` | `2 · Value as text` | copy, `ecommerce.value = "12.99"` (the **literal string**, R-05; not `String(value)`) |
  | 3 | `wrong-case-key` | `3 · Wrong-case key` | copy, with `ecommerce.transaction_ID` holding the **same value** in place of `transaction_id`. Rebuild the `ecommerce` object so the key stays in the same position |
  | 4 | `lowercase-currency` | `4 · Lower-case currency` | copy, `ecommerce.currency = "gbp"` |
  | 5 | `bad-transaction-id` | `Spare · Bad transaction ID` | copy, `ecommerce.transaction_id = "12345"` |
- **Rules**:
  - Copy with `structuredClone` (browsers and Node 24). The input may be deep-frozen by the verify script, so mutation must throw there.
  - The labels use the middle dot `·` (U+00B7) as in the data model.
  - Expected Console groups (for your understanding; the shop **never** prints them): see the contract table. For example, scenario 3 produces one error **and** one warning, because the renamed key is both "missing" and "not in the Event Definition". That is still one difference in the push.
  - **No scenario touches `add_to_cart`** (US2 scenario 2). Nothing in this file references `AddToCartPush`.
- **Notes**: `talkScript` is used by the switcher only to order and label options. Every scenario, including the spare, appears in the control.

### Subtask T020 – `site/src/datalayer/push.ts`

- **Purpose**: The single writer to `window.dataLayer` (FR-016; lint allows `dataLayer` only here).
- **Exports**:
  ```ts
  export function pushAddToCart(line: PushLine): void;
  export function pushPurchase(input: { transactionId: string; lines: readonly PushLine[]; scenario: ScenarioId }): void;
  ```
- **Behaviour**:
  - Private helper `pushEvent(obj: object)`:
    ```ts
    const dl = (window.dataLayer ??= []); // the head script normally created it already (FR-002); this is defensive only
    dl.push({ ecommerce: null });         // GA4 ecommerce clear (FR-006); no `event`, so Quadrano writes nothing (contract §5.8)
    dl.push(obj);
    ```
  - `pushAddToCart` → `pushEvent(buildAddToCart(line))`.
  - `pushPurchase` → `pushEvent(getScenario(scenario).apply(buildPurchase({ transactionId, lines })))`.
  - Exactly **two** `push` calls per action. No retries, no timers, no Console output, no return value that invites the caller to push again.
  - Touch `window` only inside functions.
- **Notes**: When to call `pushPurchase` (thank-you load, behind `takeUnpushedOrder`) is WP06's job. Don't add any guard state here; the order store owns it.

### Subtask T021 – `site/src/switcher/scenario-url.ts`

- **Purpose**: Pure-ish helpers for the `scenario` query parameter (contracts/scenario-url.md, R-04), shared by WP05 (control) and WP06 (layout, links, checkout).
- **Exports**:
  ```ts
  export const SCENARIO_PARAM = 'scenario';
  export function parseScenario(raw: string | null | undefined): { id: ScenarioId; recognised: boolean }; // missing/unknown → { id: 'correct', recognised: false }
  export function scenarioFromSearch(search: string): { id: ScenarioId; recognised: boolean };
  export function withScenario(href: string, id: ScenarioId): string; // '/product/?id=SKU-1001' → '/product/?id=SKU-1001&scenario=value-as-text'; preserves other params and hash; replaces an existing scenario param
  export function currentScenario(): ScenarioId;                      // reads location.search (browser only, inside the function)
  export function normaliseAddress(): ScenarioId;                     // if the param is missing or unknown: history.replaceState to the same URL with scenario=correct; returns the active id
  ```
- **Rules**:
  - `withScenario` must handle path-only hrefs. Use `new URL(href, 'http://local.invalid')` and return `pathname + search + hash`. Only internal (path-absolute) hrefs are passed in. Leave absolute external URLs unchanged.
  - Matching is exact and case-sensitive: `?scenario=Correct` is unknown, so it becomes `correct` and the address is normalised.
  - `normaliseAddress` uses `replaceState` (no new history entry), per contract.
  - No pushes, no storage. The scenario lives **only** in the URL (R-04).
- **Parallel?**: Yes, alongside T020 once T019 exists.

### Subtask T022 – `scripts/verify-scenarios.ts`

- **Purpose**: `pnpm verify:scenarios`: the FR-012 developer check (not a gate). It uses `node:assert/strict` only.
- **Imports**: `../site/src/datalayer/events.ts` and `../site/src/datalayer/scenarios.ts` only, **not** `push.ts` (browser).
- **Checks** (print one line per check with its name and the word `ok`, or throw with a clear message; exit code 1 on any failure):
  1. **Order and ids**: `SCENARIOS.map(s => s.id)` equals `SCENARIO_IDS` in that order; `talkScript` is false only for `bad-transaction-id`; labels equal the data-model table exactly.
  2. **Labels carry no verdict wording**: test each label against the R-08 regex `/[✓✗⚠✅❌]|\b(pass(ed|es)?|fail(ed|s|ure)?|valid|invalid)\b/i`.
  3. **Correct objects match the contract**: build `add_to_cart` and `purchase` for the hero line (`SKU-1001`, 1299, qty 1, any name) and compare with `deepStrictEqual` against the contract shapes (`value: 12.99`, `price: 12.99`, `currency: 'GBP'`).
  4. **Value arithmetic**: for baskets such as `[1299×1]`, `[1299×2, 850×3]`, `[2400×1, 1575×3, 1299×1]`: `typeof value === 'number'` and `value === Math.round(Σ pence × qty) / 100`, with every `price` a number and every `quantity` an integer.
  5. **Top-level keys**: every correct and scenario object has keys ⊆ `{event, ecommerce}`.
  6. **Exactly one difference** per broken scenario. Deep-freeze the correct `purchase` first, so mutation by `apply` throws. Compute a deep diff (`removed` / `added` / `changed` at dotted paths). Then assert it **equals** the expected diff:
     | id | expected diff |
     |---|---|
     | `missing-value` | `[removed ecommerce.value]` |
     | `value-as-text` | `[changed ecommerce.value → "12.99" (string)]` |
     | `wrong-case-key` | `[removed ecommerce.transaction_id, added ecommerce.transaction_ID]` with **equal values**, counted as **one rename**: assert exactly this pair and nothing else |
     | `lowercase-currency` | `[changed ecommerce.currency → "gbp"]` |
     | `bad-transaction-id` | `[changed ecommerce.transaction_id → "12345"]` |
     `correct` must produce an empty diff and must not be the same object reference.
  7. **Transaction IDs**: 1,000 calls to `newTransactionId()` all match `TRANSACTION_ID_PATTERN`; `"12345"` does **not** match it (so scenario 5 really breaks the pattern).
  8. **Hero literal**: for the hero basket, the correct `value` is `12.99` and the `value-as-text` value is the string `"12.99"`, so the amounts agree and only the type differs (R-05).
- **Prove it can fail**: temporarily change `lowercase-currency` to also alter `value`, run `pnpm verify:scenarios`, confirm a non-zero exit naming that scenario, then revert. Record in the Activity Log.
- **Notes**: Printing is fine here (`scripts/` is not shop output). Do not print ✓/✗ glyphs; use `ok` / `not ok` text to keep shop-verdict-like glyphs out of the repo's own output.

## Definition of Done

- [ ] Five files exist with the exports above (or documented equivalents for WP05/WP06).
- [ ] `pnpm verify:scenarios` exits 0, and was shown to exit non-zero on a two-difference mutation.
- [ ] `pnpm lint` and `pnpm exec tsc --noEmit` pass; `dataLayer` appears only in `push.ts`.
- [ ] `TRANSACTION_ID_PATTERN` and each Attribute name are defined once.
- [ ] No import from `site/src/shop/`; no DOM access at import time anywhere.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Scenario 2 pushes `String(total)` rather than the literal | The table says literal; check 8 enforces it |
| `apply` mutates the shared correct object | `structuredClone`; check 6 deep-freezes the input |
| Rename counted as two differences | Expected-diff table treats it as one specified pair |
| Freeze changes names | Single definitions; WP08 edits a few lines, and verify catches drift |
| Float output like `12.990000000000002` | Integer pence summed first; check 4 |

## Review Guidance

- Put `contracts/datalayer-pushes.md` side by side with `events.ts` and `scenarios.ts`. Every key name, literal and type must match.
- Run `pnpm verify:scenarios` yourself. Then break one scenario (two differences) and confirm it fails.
- Grep `site/` for `dataLayer`: only `push.ts`.
- Confirm `push.ts` makes exactly two pushes per call and nothing else.

## Activity Log

> Entries in chronological order (oldest first). Append only. Format: `- YYYY-MM-DDTHH:MM:SSZ – <agent_id> – <action>`.

- 2026-10-24T21:50:34Z – system – Prompt created.
