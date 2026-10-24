---
work_package_id: WP03
title: Shop state – catalogue, basket and order
dependencies:
- WP01
requirement_refs:
- C-001
- C-010
- FR-001
planning_base_branch: feat/demo-shop
merge_target_branch: feat/demo-shop
branch_strategy: Planning artifacts for this mission were generated on feat/demo-shop. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/demo-shop unless the human explicitly redirects the landing branch.
subtasks:
- T014
- T015
- T016
- T017
phase: Phase 2 - Foundational
history:
- at: '2026-10-24T21:50:34Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: site/src/shop/
create_intent:
- site/src/shop/catalogue.ts
- site/src/shop/storage.ts
- site/src/shop/basket-store.ts
- site/src/shop/order-store.ts
execution_mode: code_change
model: ''
owned_files:
- site/src/shop/catalogue.ts
- site/src/shop/storage.ts
- site/src/shop/basket-store.ts
- site/src/shop/order-store.ts
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP03 – Shop state – catalogue, basket and order

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

Deliver the client-side state layer as **pure TypeScript modules with no DOM rendering**. WP06's pages consume them:

- A static catalogue of about four **fictional** products (C-010). The first listed is the **hero product `SKU-1001` at 1299 pence** (£12.99, research R-05).
- `storage.ts`: sessionStorage wrapped in try/catch with an in-memory fallback (R-07).
- `basket-store.ts`: lines `{ itemId, quantity }`, one line per item, add increments, total in pence, clear, restore.
- `order-store.ts`: the Order record and its lifecycle (data-model.md): `Placed → Pushed`, plus "Order again". It exposes the `pushed` guard WP06 relies on for "one event push per action" (FR-016, R-03).
- Money is **integer pence only** in this layer. Conversion to push amounts happens in WP04 (`events.ts`).
- `pnpm lint` and `pnpm exec tsc --noEmit` pass.

## Context & Constraints

- `kitty-specs/demo-shop-01M5QW5Y/data-model.md`: **the acceptance source** for Product, Basket, Order and the Order lifecycle diagram.
- `research.md`: R-03 (when `purchase` is pushed), R-05 (hero price), R-07 (storage), R-12 (fictional brand).
- `spec.md`: C-001 (static only), C-010 (fictional brand), edge cases "Empty basket at checkout", "Repeated clicks".
- **Independence from WP04**: this WP runs in parallel with the data layer WP, so it **must not import** from `site/src/datalayer/` or `site/src/switcher/`:
  - `Order.scenario` is stored as a plain `string`. WP06 resolves it with WP04's helpers at read time.
  - The `transactionId` is **passed in** by the caller (WP06 checkout generates it with WP04's `newTransactionId()`).
- Code rules (WP01): relative imports with `.ts` extension; erasable syntax only (no `enum`; use `as const` objects or string unions); no `console`; no verdict words in strings (lint); no `dataLayer` access.
- Terminology: comments say "Attribute" for keys in pushed events. Product fields here are plain data, not Attributes.

## Branch Strategy

- **Strategy**: Planning artifacts were generated on feat/demo-shop; completed changes must merge back into feat/demo-shop.
- **Planning base branch**: feat/demo-shop
- **Merge target branch**: feat/demo-shop
- Execution worktrees are allocated per computed lane from `lanes.json`; start with `spec-kitty agent action implement WP03 --agent claude`.

## Subtasks & Detailed Guidance

### Subtask T014 – `site/src/shop/catalogue.ts`

- **Purpose**: The fictional product range the shop sells (FR-001 plausibility in GTM Preview).
- **Steps**:
  1. Define and export:
     ```ts
     export interface Product {
       readonly itemId: string;     // becomes the item_id Attribute
       readonly name: string;       // becomes item_name; fictional (C-010)
       readonly pricePence: number; // integer > 0
       readonly art: ArtId;         // id of original inline SVG art (rendered by WP06's ui/art.ts)
       readonly blurb: string;      // one short sentence for the product page
     }
     export type ArtId = 'mug' | 'notebook' | 'candle' | 'tote'; // adjust to match your products
     ```
  2. Export `PRODUCTS: readonly Product[]` with about four items. **The first must be `{ itemId: 'SKU-1001', pricePence: 1299, … }`**. Others use `SKU-1002`… and varied plausible prices (e.g. 850, 2400, 1575).
  3. Export `HERO_PRODUCT_ID = 'SKU-1001'`, `getProduct(id: string | null | undefined): Product | undefined`, and `getProductOrHero(id): Product`. The latter falls back to the hero for unknown or missing IDs (contracts/scenario-url.md: "an unknown or missing `id` shows the hero product").
  4. Product names are **generic and descriptive** (e.g. "Stoneware Mug", "Linen Notebook"), not brand names. Pick a fictional **shop brand name** and export it as `SHOP_NAME`. Before settling, do a quick web search to check it isn't an existing retailer or trademark. Record the name and the check in the Activity Log for Product Owner sign-off (R-12, C-010).
- **Validation**: no duplicate `itemId`; every `pricePence` is a positive integer (`Number.isInteger`).
- **Parallel?**: Yes, independent of T015–T017.
- **Note**: The art itself is drawn in WP06 (`ui/art.ts`); here you only choose the IDs.

### Subtask T015 – `site/src/shop/storage.ts`

- **Purpose**: Basket and order survive navigation within a tab (sessionStorage), and the shop still works when storage throws (private mode, blocked site data). Covers the "nothing in the shop errors" edge case.
- **Steps**:
  1. Export the keys: `BASKET_KEY = 'demo-shop:basket'`, `ORDER_KEY = 'demo-shop:order'`.
  2. Export `readJson<T>(key: string, guard: (v: unknown) => v is T): T | undefined`:
     - Try `sessionStorage.getItem`. On any throw, fall back to a module-level `Map<string, string>`.
     - Parse with `JSON.parse` inside try/catch. Return `undefined` on parse failure or if `guard` rejects. **Never trust stored shape**, because a stale or hand-edited value must not crash a page.
  3. Export `writeJson(key: string, value: unknown): void` and `remove(key: string): void`, which try sessionStorage then always mirror to the memory map. Writing to both means reads succeed even if storage starts throwing mid-session.
  4. Access `sessionStorage` lazily inside functions via `globalThis.sessionStorage`, guarded by `typeof`. The module must import cleanly in Node for the throwaway check below and must not touch globals at import time.
- **Notes**: localStorage and cookies are out (R-07, C-011).

### Subtask T016 – `site/src/shop/basket-store.ts`

- **Purpose**: The session basket (data-model "Basket").
- **API** (suggested):
  ```ts
  export interface BasketLine { readonly itemId: string; readonly quantity: number } // quantity: integer ≥ 1
  export function getLines(): readonly BasketLine[];
  export function addItem(itemId: string, quantity?: number): BasketLine; // default 1; increments existing line; returns the resulting line
  export function setQuantity(itemId: string, quantity: number): void;    // < 1 removes the line; non-integers rejected (floor or ignore, and document which)
  export function removeItem(itemId: string): void;
  export function clear(): void;
  export function restore(lines: readonly BasketLine[]): void;            // used by "Order again"
  export function itemCount(): number;                                    // Σ quantity, for the header badge
  export function totalPence(): number;                                   // Σ pricePence × quantity via the catalogue
  export function isEmpty(): boolean;
  ```
- **Rules**:
  - One line per `itemId`; adding again increments (data-model).
  - Lines whose `itemId` is not in the catalogue are dropped on read, so a stale session cannot break the total.
  - Persist via `storage.ts` under `BASKET_KEY` with a type guard.
  - `addItem` returns the **added** line info so WP06 can push `add_to_cart` for the added quantity only (contract: "for the added line only (quantity 1)"). The caller builds the push; this module never pushes.
- **Edge cases**: repeated rapid `addItem` calls each add 1 (no debouncing here; one click is one action). Quantity overflow is not a concern.

### Subtask T017 – `site/src/shop/order-store.ts`

- **Purpose**: The Order record that bridges "Place order" on checkout and the `purchase` push on thank-you load (R-03), with the `pushed` guard against double pushes on reload or back/forward.
- **Types**:
  ```ts
  export interface OrderLine { readonly itemId: string; readonly name: string; readonly pricePence: number; readonly quantity: number }
  export interface Order {
    readonly transactionId: string;   // generated by the caller (WP04 newTransactionId), stored verbatim
    readonly lines: readonly OrderLine[];  // snapshot of the basket at Place order
    readonly totalPence: number;      // snapshot
    readonly scenario: string;        // scenario id active at Place order; resolved by WP06 via WP04 helpers
    readonly pushed: boolean;
  }
  ```
- **API** (suggested):
  - `placeOrder(input: { transactionId: string; scenario: string }): Order | undefined`. If the basket is empty, return `undefined` and change nothing (the invariant "an empty basket cannot place an order"). Otherwise snapshot the basket lines with name and price from the catalogue, compute `totalPence`, write the order with `pushed: false`, **clear the basket**, and return the order.
  - `getOrder(): Order | undefined`, validated with a type guard.
  - `takeUnpushedOrder(): Order | undefined`. If an order exists with `pushed === false`, write it back with `pushed: true` **first**, then return the original. Otherwise return `undefined`. The caller pushes immediately in the same synchronous task (data-model "Atomicity"). Marking before returning means that even if anything throws afterwards, a reload cannot double-push. The worst case is a missed push, never a double one.
  - `orderAgain(): boolean`. Restores the last order's lines to the basket (`basket.restore`), no push, and returns whether there was an order. It does not delete the order; the next `placeOrder` overwrites it.
- **Notes**:
  - A new `placeOrder` while a previous order is still unpushed (e.g. presenter double-clicks Place order) **overwrites** it. WP06 also disables the button on first click.
  - Keep `takeUnpushedOrder` the **only** way to flip `pushed`. Document this in a short comment, since it is the FR-016 guarantee.

## Verification (no test framework; QDR-003)

Run a **throwaway** Node check, not committed and kept outside `site/` (e.g. in your scratch dir). Node 24 strips types, and the modules must not touch the DOM at import:

```bash
node --input-type=module -e "
  const b = await import('./site/src/shop/basket-store.ts');
  const o = await import('./site/src/shop/order-store.ts');
  b.addItem('SKU-1001'); b.addItem('SKU-1001'); b.addItem('SKU-1002');
  console.log(b.getLines(), b.totalPence());
  const ord = o.placeOrder({ transactionId: 'T-000001', scenario: 'correct' });
  console.log(ord, b.isEmpty());
  console.log(o.takeUnpushedOrder()?.pushed, o.takeUnpushedOrder());   // false, undefined
  console.log(o.orderAgain(), b.getLines());
"
```

Without `sessionStorage` in Node, this exercises the memory fallback. Also simulate a throwing storage: define a `globalThis.sessionStorage` whose methods throw, then repeat. Record the output summary in the Activity Log.

## Definition of Done

- [ ] Four modules exist with the APIs above (names may differ if documented in the Activity Log for WP06).
- [ ] Hero product `SKU-1001` at 1299 pence is first in `PRODUCTS`.
- [ ] No imports from `datalayer/` or `switcher/`; no DOM rendering; no `console`; no `dataLayer`.
- [ ] Throwaway check shows: increment, totals, empty-basket refusal, single `pushed` flip, Order again restore, storage-throws fallback.
- [ ] `pnpm lint` and `pnpm exec tsc --noEmit` pass.
- [ ] Brand name and real-brand check recorded for Product Owner sign-off.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Float drift in totals | Integer pence only; conversion lives in WP04 |
| Corrupt or stale sessionStorage crashes a page | Type guards on every read; drop unknown items |
| Double `purchase` on reload | `takeUnpushedOrder` marks before returning; it is the only writer of `pushed` |
| Real-brand clash | Web check, then Product Owner sign-off (C-010) |

## Review Guidance

- Walk the data-model Order lifecycle diagram against `order-store.ts`, one transition at a time.
- Confirm `placeOrder` on an empty basket changes nothing.
- Confirm the module graph has no import from `datalayer/` or `switcher/`.
- Check product and brand names are generic and fictional.

## Activity Log

> Entries in chronological order (oldest first). Append only. Format: `- YYYY-MM-DDTHH:MM:SSZ – <agent_id> – <action>`.

- 2026-10-24T21:50:34Z – system – Prompt created.
