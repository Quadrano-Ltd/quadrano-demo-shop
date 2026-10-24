---
work_package_id: WP06
title: Pages, layout and GTM install
dependencies:
- WP03
- WP04
- WP05
requirement_refs:
- C-001
- C-010
- C-011
- FR-001
- FR-002
- FR-003
- FR-004
- FR-005
- FR-006
- FR-016
- FR-017
- NFR-001
- NFR-004
- NFR-005
planning_base_branch: feat/demo-shop
merge_target_branch: feat/demo-shop
branch_strategy: Planning artifacts for this mission were generated on feat/demo-shop. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/demo-shop unless the human explicitly redirects the landing branch.
subtasks:
- T027
- T028
- T029
- T030
- T031
- T032
- T033
phase: Phase 3 - User stories
history:
- at: '2026-10-24T21:50:34Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: site/src/pages/
create_intent:
- vite.config.ts
- site/index.html
- site/product/index.html
- site/basket/index.html
- site/checkout/index.html
- site/thank-you/index.html
- site/src/pages/listing.ts
- site/src/pages/product.ts
- site/src/pages/basket.ts
- site/src/pages/checkout.ts
- site/src/pages/thank-you.ts
- site/src/ui/layout.ts
- site/src/ui/styles.css
- site/src/ui/art.ts
- public/favicon.svg
execution_mode: code_change
model: ''
owned_files:
- vite.config.ts
- site/index.html
- site/product/index.html
- site/basket/index.html
- site/checkout/index.html
- site/thank-you/index.html
- site/src/pages/listing.ts
- site/src/pages/product.ts
- site/src/pages/basket.ts
- site/src/pages/checkout.ts
- site/src/pages/thank-you.ts
- site/src/ui/layout.ts
- site/src/ui/styles.css
- site/src/ui/art.ts
- public/favicon.svg
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP06 – Pages, layout and GTM install

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

Assemble the shop the audience sees: five thin static pages (FR-001) that

- create `window.dataLayer` in an inline head script **before** anything else, GTM included (FR-002);
- load the shop's GTM container on every page **only when** a valid ID was supplied at build through `VITE_GTM_CONTAINER_ID`. The ID is never stored in the repo, and there is no fallback (FR-003, C-003, decision `…QCGY`);
- push `add_to_cart` once per Add-to-basket click (FR-004, FR-016);
- on Place order, save the order and navigate. The **thank-you page pushes `purchase` once on load**, and a reload or back/forward never pushes again (FR-005, R-03);
- mount WP05's scenario control in every header, with every internal link carrying `?scenario=` (FR-013/014 integration);
- stay fast, quiet and accessible: no web fonts, no raster images, no requests except own assets and GTM (NFR-001, NFR-004), no Console output or verdict wording (FR-017), keyboard operable with a visible focus ring (NFR-005).

**Done when**: `pnpm build && pnpm preview` with no ID works end to end, `window.dataLayer` holds exactly the expected shop pushes, and with `VITE_GTM_CONTAINER_ID=GTM-XXXXXXX` (the allowlisted placeholder, which is format-valid) every built page carries the GTM snippet right after the data layer script.

## Context & Constraints

- **Acceptance sources**: `contracts/datalayer-pushes.md` ("Sequence per action" table), `contracts/scenario-url.md`, `data-model.md` (Order lifecycle), `spec.md` edge cases.
- `research.md`: R-01 (GTM injection plugin), R-03 (push on thank-you load), R-07 (Order again), R-12 (visuals and copy).
- `plan.md`: Project Structure (Vite root `site/`, `public/` at repo root, output `dist/`).
- **APIs you consume** (read the real files first; names below are as specified in their prompts):
  - WP03 `site/src/shop/`: `PRODUCTS`, `SHOP_NAME`, `getProductOrHero`, `ArtId` (catalogue); `addItem`, `getLines`, `removeItem`, `itemCount`, `totalPence`, `isEmpty` (basket-store); `placeOrder`, `getOrder`, `takeUnpushedOrder`, `orderAgain` (order-store).
  - WP04 `site/src/datalayer/`: `pushAddToCart`, `pushPurchase` (push); `newTransactionId` (events); `getScenario`, `isScenarioId`, `DEFAULT_SCENARIO_ID` (scenarios). `site/src/switcher/scenario-url.ts`: `currentScenario`, `withScenario`.
  - WP05 `site/src/switcher/switcher.ts`: `mountScenarioSwitcher`, `syncScenarioLinks`, `SCENARIO_CHANGE_EVENT`.
  If an API differs from this list, adapt to the real one. Do not edit files owned by WP03, WP04 or WP05; record any friction in the Activity Log.
- **Never paste Google's placeholder container ID from their documentation** into any file. The plugin interpolates the validated env value only. The only container-ID-shaped literal allowed anywhere in the repo is `GTM-XXXXXXX`, and you don't need it in code at all.
- Lint rules from WP01 apply to everything under `site/`: no `console`, no verdict words in strings (`pass`, `fail`, `valid`, `invalid` and their forms, plus tick or cross glyphs), no `fetch` or other network APIs, no `dataLayer` outside `push.ts`, no `node:` imports. HTML files aren't linted; keep their copy to the same rules by hand.
- `vite.config.ts` runs in Node: `node:` imports are fine there.
- Copy tone: plausible small online shop. A footer line makes clear it's fictional ("A fictional shop for a live demo. Nothing here is for sale."). Terminology Canon applies to any comment about pushes ("Attribute").

## Branch Strategy

- **Strategy**: Planning artifacts were generated on feat/demo-shop; completed changes must merge back into feat/demo-shop.
- **Planning base branch**: feat/demo-shop
- **Merge target branch**: feat/demo-shop
- Execution worktrees are allocated per computed lane from `lanes.json`; start with `spec-kitty agent action implement WP06 --agent claude`.

## Subtasks & Detailed Guidance

### Subtask T027 – `vite.config.ts`: MPA inputs and GTM injection plugin

- **Purpose**: Multi-page build plus build-time GTM install (R-01).
- **Steps**:
  1. Config shape:
     ```ts
     import { defineConfig, loadEnv, type Plugin } from 'vite';
     import { resolve } from 'node:path';

     const SITE = resolve(import.meta.dirname, 'site');
     const PAGES = {
       listing: 'index.html',
       product: 'product/index.html',
       basket: 'basket/index.html',
       checkout: 'checkout/index.html',
       'thank-you': 'thank-you/index.html',
     } as const;

     export default defineConfig(({ mode }) => {
       const env = loadEnv(mode, import.meta.dirname, 'VITE_');
       return {
         root: SITE,
         publicDir: resolve(import.meta.dirname, 'public'),
         build: {
           outDir: resolve(import.meta.dirname, 'dist'),
           emptyOutDir: true,
           rollupOptions: { input: Object.fromEntries(Object.entries(PAGES).map(([k, p]) => [k, resolve(SITE, p)])) },
         },
         plugins: [gtm(env.VITE_GTM_CONTAINER_ID ?? process.env.VITE_GTM_CONTAINER_ID)],
       };
     });
     ```
     Confirm `loadEnv` picks up a `VITE_`-prefixed variable from the **process environment** (Cloudflare provides it that way, with no `.env` file). The `?? process.env…` fallback covers it either way.
  2. The `gtm(id)` plugin:
     - `const VALID = /^GTM-[A-Z0-9]{4,10}$/;` with `const ok = typeof id === 'string' && VALID.test(id.trim());`
     - If not ok: in `configResolved(config)`, call `config.logger.warn('VITE_GTM_CONTAINER_ID is not set or not a container ID; building pages without GTM.')`. **Never include the value** in any message.
     - `transformIndexHtml: { order: 'pre', handler(html, ctx) { … } }`: require **both** markers `<!-- gtm:head -->` and `<!-- gtm:body -->` exactly once each. Otherwise `throw new Error(`GTM markers missing in ${ctx.filename}`)`, since a page without markers is a bug. Replace them with the snippets when ok, or with an empty string when not.
     - Head snippet: Google's published GTM install code, with the validated ID interpolated:
       ```html
       <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');</script>
       ```
     - Body snippet:
       ```html
       <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${id}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
       ```
     - The ID is regex-validated before interpolation, so no escaping issue can arise.
  3. The plugin runs in dev too, so a developer's gitignored `.env.local` enables GTM under `pnpm dev`.
- **Validation** (Git Bash syntax; in PowerShell set `$env:VITE_GTM_CONTAINER_ID` first):
  - `pnpm build` (no ID) → one warning line naming the variable; `grep -L googletagmanager dist/**/*.html` lists all five pages (none contain it).
  - `VITE_GTM_CONTAINER_ID=GTM-XXXXXXX pnpm build` → all five pages contain the snippet, which appears **after** the data layer script (inspect `dist/index.html`).
  - `VITE_GTM_CONTAINER_ID=nonsense pnpm build` → warning, no snippet.
  - `dist/` stays untracked (`git status`).

### Subtask T028 – Five HTML documents and `public/favicon.svg`

- **Each page** (`site/index.html`, `site/product/index.html`, `site/basket/index.html`, `site/checkout/index.html`, `site/thank-you/index.html`) follows this skeleton:
  ```html
  <!doctype html>
  <html lang="en-GB">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <script>window.dataLayer = window.dataLayer || [];</script>
      <!-- gtm:head -->
      <title>Basket · {Shop name}</title>
      <meta name="description" content="…" />
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <link rel="stylesheet" href="/src/ui/styles.css" />
      <script type="module" src="/src/pages/basket.ts"></script>
    </head>
    <body>
      <!-- gtm:body -->
      <div id="app"></div>
      <noscript><p>This demo shop needs JavaScript.</p></noscript>
    </body>
  </html>
  ```
  - The **inline data layer script is the first script in `<head>`** (FR-002). Nothing may precede it except the two `meta` tags.
  - Use the shop name from WP03's `SHOP_NAME`, written literally into each `<title>` (HTML can't import it). Keep it consistent.
  - Entry script per page: `listing.ts`, `product.ts`, `basket.ts`, `checkout.ts`, `thank-you.ts`.
- `public/favicon.svg`: a small original SVG mark (simple shapes, brand colour). No third-party icon sets.
- **Notes**: No `<link>` to fonts or CDNs (NFR-004). Directory-style URLs (`/product/`) work in Vite dev, `vite preview` and Cloudflare Pages.

### Subtask T029 – `site/src/ui/`: layout, styles, art

- **`layout.ts`** exports (suggested):
  ```ts
  export type PageId = 'listing' | 'product' | 'basket' | 'checkout' | 'thank-you';
  export function renderLayout(page: PageId, heading: string): HTMLElement; // builds header + <main> + footer into #app; returns <main>
  export function refreshBasketCount(): void;                               // updates the header badge from itemCount()
  export function announce(message: string): void;                          // writes to an aria-live="polite" region
  export function formatPrice(pence: number): string;                       // Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
  ```
  - Header: wordmark link to `/` (shop name), nav links **Shop** `/`, **Basket** `/basket/` (with count badge), **Checkout** `/checkout/`, `aria-current="page"` on the current one, and a container where you call `mountScenarioSwitcher(container)` (WP05). Mount the switcher **first**, so the address is normalised before links are built.
  - Build every internal `href` with `withScenario(path, currentScenario())`, then call `syncScenarioLinks(document)` after the page body renders. Pages that render more links later call it again.
  - A visually hidden `aria-live="polite"` region for `announce()`.
  - Footer: the fictional-shop line.
  - Create elements with `createElement` and `textContent`, not string `innerHTML` with data.
- **`styles.css`**: system font stack (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`), no `@import`, no `url()` to other origins. Stage-friendly sizing (base ≈ 18px, strong contrast, since this goes on a projector). Responsive product grid. Buttons and links with a clear **`:focus-visible` outline** (e.g. 3px solid, offset 2px) on links, buttons and `#scenario-select` (NFR-005). A `.visually-hidden` utility. Respect `prefers-reduced-motion`.
- **`art.ts`**: `renderArt(id: ArtId, label?: string): SVGSVGElement`, built with `createElementNS`. Original simple-shape drawings (mug, notebook, and so on, matching WP03's `ArtId`s), `aria-hidden="true"` (the product name is shown as text beside it). No raster images, no external SVG.

### Subtask T030 – Listing and product pages, `add_to_cart`

- **`pages/listing.ts`**:
  - `const main = renderLayout('listing', 'Shop')`. One card per product: art, name linked to `/product/?id=<itemId>` (through `withScenario`), price, and an **Add to basket** button (quick-add; the contract lists "listing quick-add" as an add-to-basket action).
- **`pages/product.ts`**:
  - `const product = getProductOrHero(new URLSearchParams(location.search).get('id'))` (unknown or missing id shows the hero, per contract). Render art, name, price, blurb and an **Add to basket** button, plus a "View basket" link.
- **Add-to-basket handler** (shared shape; a small local function in each page file is fine):
  ```ts
  button.addEventListener('click', () => {
    addItem(product.itemId, 1);
    pushAddToCart({ itemId: product.itemId, name: product.name, pricePence: product.pricePence, quantity: 1 });
    refreshBasketCount();
    announce(`${product.name} added to your basket`);
  });
  ```
  - **One click → one `addItem` → one `pushAddToCart`** (two `dataLayer` entries: the clear, then the event). Attach each listener exactly once (render once; no re-render loops that re-bind).
  - The push is for the **added quantity (1)**, not the line's running total (contract: "for the added line only").
  - Scenario does **not** affect `add_to_cart` (no scenario argument exists).
- **Edge case**: rapid repeated clicks are separate actions, so separate pushes is correct (spec "Repeated clicks": no *double* push from *one* click).

### Subtask T031 – Basket page

- **`pages/basket.ts`**: `renderLayout('basket', 'Your basket')`.
  - Lines: art thumbnail, name, unit price, quantity, line total (`formatPrice`), and a **Remove** button. Removing calls `removeItem`, re-renders the list, `refreshBasketCount()`, and makes **no push** (`remove_from_cart` is out of scope; FR-016 maps pushes to add to basket and place order only).
  - Total (`totalPence`).
  - Non-empty: a prominent **Go to checkout** link (`/checkout/` with scenario). Empty: "Your basket is empty." with a link back to the shop, and no checkout link.
  - After re-render, call `syncScenarioLinks(main)`.
- **Parallel?**: Yes, alongside T030 once T029 exists.

### Subtask T032 – Checkout page, Place order

- **`pages/checkout.ts`**: `renderLayout('checkout', 'Checkout')`.
  - Order summary (lines, total). A short "Delivery: Standard (free)" line and "No payment is taken: this is a demo." for plausibility, avoiding any verdict words.
  - **Active scenario** line: `Scenario: <label>` from `getScenario(currentScenario()).label`, updated on `document`'s `SCENARIO_CHANGE_EVENT` (it helps the presenter confirm the staged case before clicking).
  - **Place order** `<button type="button">`: `disabled` when `isEmpty()` (spec edge case "Empty basket at checkout"). In that case also show the empty message and a shop link.
  - Click handler:
    ```ts
    placeButton.disabled = true;                       // one click = one order (guards double-click)
    const scenario = currentScenario();                // the scenario active when Place order is pressed (R-04)
    const order = placeOrder({ transactionId: newTransactionId(), scenario });
    if (!order) { placeButton.disabled = false; return; }  // empty basket: nothing happens, no push
    location.assign(withScenario('/thank-you/', scenario));
    ```
  - **No push on checkout.** The `purchase` push happens on thank-you load (R-03). Pushing here would lose the Console group to navigation.

### Subtask T033 – Thank-you page: `purchase` on load, reload guard, Order again

- **`pages/thank-you.ts`**, at module top level (runs once per page load):
  ```ts
  const fresh = takeUnpushedOrder();   // flips pushed=true before returning (WP03)
  if (fresh) {
    const scenario = isScenarioId(fresh.scenario) ? fresh.scenario : DEFAULT_SCENARIO_ID;
    pushPurchase({ transactionId: fresh.transactionId, lines: fresh.lines, scenario });  // same synchronous task
  }
  const order = fresh ?? getOrder();
  ```
  Do **not** move the push behind any `await`, timer or event; it must happen in the same task as `takeUnpushedOrder` (data-model "Atomicity").
- Render via `renderLayout('thank-you', 'Thank you')`:
  - If `order` exists: "Thank you for your order." Order reference (`transactionId`), lines, total. An **Order again** button that calls `orderAgain()` and then `location.assign(withScenario('/checkout/', currentScenario()))`, with **no push** (R-07). Also a "Continue shopping" link.
  - If no order: a neutral "No recent order" state with a shop link and no push (R-03).
- Behaviour to confirm: a reload or back/forward to this page shows the confirmation (from `getOrder()`) and **does not push** (`pushed` is already true). The talk loop (quickstart rows 3–7) is Order again → choose scenario in the control at checkout → Place order → thank-you pushes once with the new scenario.

## End-to-end check (record in the Activity Log)

With `pnpm build && pnpm preview` (no GTM ID), DevTools Console open, run `dataLayer.filter(e => !String(e.event ?? '').startsWith('gtm.'))` after each step. GTM's own `gtm.*` entries appear only when an ID is set:

1. `/product/?id=SKU-1001&scenario=correct` → Add to basket → `[{ecommerce:null}, {event:'add_to_cart', …value: 12.99…}]`.
2. Checkout → Place order → on thank-you: `[{ecommerce:null}, {event:'purchase', ecommerce:{transaction_id:'T-…', currency:'GBP', value:12.99, items:[…]}}]`.
3. Reload thank-you → still exactly those two entries (the page reload resets `dataLayer`, so check that **zero** shop pushes happened on the reload).
4. Order again → in the control choose `2 · Value as text` → Place order → thank-you shows `value: "12.99"` (string). Repeat for each broken scenario, and compare each object with `contracts/datalayer-pushes.md`.
5. Change the scenario on any page → no new entries; the address and nav links change.
6. Empty basket → checkout → Place order disabled; no push.
7. DevTools request blocking on `googletagmanager.com` with the placeholder-ID build → pages still work and push (edge case "GTM fails to load").
8. Keyboard only: reach and operate nav, switcher, Add to basket, Remove, Place order and Order again, with a focus ring visible on each.

## Definition of Done

- [ ] All files in `owned_files` exist; `pnpm build` passes (tsc + vite) with and without the placeholder ID.
- [ ] The inline data layer script is the first script on every page; GTM markers are replaced correctly in both cases.
- [ ] The end-to-end check (steps 1–8) passes and is logged.
- [ ] `pnpm lint` passes; `site/` has no `console`, no network APIs, no verdict wording; HTML copy follows the same rule.
- [ ] No container-ID-shaped literal anywhere in committed files; `dist/` untracked.
- [ ] Nav links and every internal link carry `?scenario=`; the switcher is mounted on all five pages.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `purchase` pushed on click and lost to navigation | Push only in `thank-you.ts` top level (R-03) |
| Double `purchase` on reload | `takeUnpushedOrder` guard; step 3 of the check |
| GTM snippet before the data layer script | Marker placed after the inline script; check the built HTML |
| Missing ID breaks the build or silently uses an old ID | Warning plus no tag; no literal ID anywhere |
| Listeners bound twice → two pushes per click | Render once; review for re-binding |
| `loadEnv` ignores the process env on Cloudflare | `?? process.env…` fallback; verified in T027 |

## Review Guidance

- Open each built page in `dist/` and read the `<head>`: meta, inline data layer script, GTM (when set), then the rest.
- Run end-to-end steps 1–5 yourself and compare objects with the contract.
- Grep `site/src/pages/` for `pushPurchase`: only `thank-you.ts`. Grep for `pushAddToCart`: only listing and product.
- Check copy for verdict words in HTML, which lint doesn't cover.
- Charter checklist: 4 (no secrets), 6 (scenario switcher shows every case), 7 (terminology).

## Activity Log

> Entries in chronological order (oldest first). Append only. Format: `- YYYY-MM-DDTHH:MM:SSZ – <agent_id> – <action>`.

- 2026-10-24T21:50:34Z – system – Prompt created.
