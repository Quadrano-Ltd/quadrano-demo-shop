# quadrano-demo-shop

Demo shop for Quadrano: a static mini-shop that pushes correct and deliberately broken data layer events.

## What it is

Thimblewick is a fictional static shop whose data layer pushes — correct and deliberately broken — are validated live by Quadrano. The shop pushes data and never judges it: every ✓ or ✗ verdict you see on stage is Quadrano's own.

## Run locally

Prerequisites: Node 24 LTS (per `.node-version`) and pnpm 10 (per `packageManager`, enabled with `corepack enable`). The provenance gate needs a denylist at `~/.quadrano/provenance-denylist.txt` (or set `QUADRANO_DENYLIST_PATH`); it lives outside the repo and the gate fails without it.

```bash
corepack enable
pnpm install              # also installs the pre-push hook (core.hooksPath)
pnpm dev                  # Vite dev server; no GTM unless VITE_GTM_CONTAINER_ID is set in .env.local (gitignored)
pnpm gates                # lint → build → no-secrets → provenance
pnpm verify:scenarios     # FR-012 one-difference check
pnpm verify:results       # the Console lint rule still fires outside the Results capture file
```

Tooling detail, the command table and the secrets rules are in [`AGENTS.md`](AGENTS.md).

## Talk bookmarks

Bookmark these for the demo. `scenario` defaults to `correct` when omitted; an unknown value also means `correct`.

| Step | Link |
|---|---|
| Start | `https://demo.quadrano.com/?scenario=correct` |
| Hero product | `https://demo.quadrano.com/product/?id=SKU-1001&scenario=correct` |
| Broken 1–4 / spare | `https://demo.quadrano.com/checkout/?scenario=<id>` (after a basket exists, or use **Order again**) |

The six checkout links:

| Scenario | Link |
|---|---|
| Correct | `https://demo.quadrano.com/checkout/?scenario=correct` |
| 1 · Missing value | `https://demo.quadrano.com/checkout/?scenario=missing-value` |
| 2 · Value as text | `https://demo.quadrano.com/checkout/?scenario=value-as-text` |
| 3 · Wrong-case key | `https://demo.quadrano.com/checkout/?scenario=wrong-case-key` |
| 4 · Lower-case currency | `https://demo.quadrano.com/checkout/?scenario=lowercase-currency` |
| Spare · Bad transaction ID | `https://demo.quadrano.com/checkout/?scenario=bad-transaction-id` |

## Stage loop

Product → **Add to basket** → Checkout → **Place order** → thank-you → **Order again** → pick a scenario → **Place order** → repeat.

- **Add to basket** pushes `add_to_cart`; the Console shows `✓ add_to_cart`.
- **Place order** pushes `purchase` on the thank-you page load, once per order. The Console group depends on the scenario:

| Scenario | Expected Console group (summary) |
|---|---|
| Correct | `✓ purchase` |
| 1 · Missing value | `✗ purchase · 1 error` — value is required but missing |
| 2 · Value as text | `✗ purchase · 1 error` — value should be a number, got `"12.99"` |
| 3 · Wrong-case key | `✗ purchase · 1 error, 1 warning` — missing `transaction_id`, `transactionId` not in the Event Definition |
| 4 · Lower-case currency | `✗ purchase · 1 error` — currency should be GBP, EUR or USD |
| Spare · Bad transaction ID | `✗ purchase · 1 error` — transaction_id should match the pattern |

The exact, character-for-character text is in [`kitty-specs/demo-shop-01M5QW5Y/contracts/datalayer-pushes.md`](kitty-specs/demo-shop-01M5QW5Y/contracts/datalayer-pushes.md) — compare against that.

## Before going on stage

Chrome, with DevTools Console open and **"Preserve log" off**, Tag Assistant connected, and the "Demo Shop" Specification's tag installed in the shop's GTM container.

## Attendees on phones (Results view)

A phone has no Console, so the Demo menu can repeat Quadrano's Console output on the page.

- **Link for a slide or QR code:** `https://demo.quadrano.com/?results=on`. It opens the shop with the view on. The attendee opens **Demo menu** and presses a playground button; the result appears under the Event playground.
- **Without the link:** open **Demo menu** and turn on **Show Quadrano's output on this page**. The page reloads.
- **This tab only.** The choice is kept in the tab's session storage. A new tab starts with the view off.
- **Off by default.** With the view off, nothing about the page changes, so the stage path is as before. Don't use the link in the browser you present from: with the view on, DevTools names the shop, not the snippet, as the source of each Console line.
- **Every word is Quadrano's.** The shop repeats the runtime's text and adds none of its own. It still never judges a push.
- **"Quadrano hasn't loaded in this browser"** means the runtime's first line never appeared. On a phone the likely cause is a content blocker stopping GTM.
- The link never sets or changes the container.

## If the venue network fails (offline mode, FR-021)

Build the shop in offline mode, which adds an **Offline mode** panel where you paste the snippet from `/local`. The shop runs it directly with no GTM, so the Event playground logs the same Console lines as production (including step 8's coupon line).

```bash
pnpm build --mode offline                          # writes dist-offline/
pnpm preview --mode offline                        # serves dist-offline/ on http://localhost:4173
```

`pnpm preview --mode offline` reads the build mode from `vite.config.ts` and serves `dist-offline/`; do not pass `--outDir`, because Vite resolves a relative `--outDir` against the Vite root (`site/`) and would look in `site/dist-offline`.

Open <http://localhost:4173>, paste the snippet from **Get snippet** into the **Offline mode** panel, press **Use this snippet**, reload the page, then use the Event playground. The stored snippet lives in `sessionStorage` (per-tab, gone when the browser closes); **Clear** removes it. With no snippet loaded the playground logs nothing — the shop pushes and never judges.

The offline build keeps the GTM loader, so if the network comes back and GTM also loads, both may run and the Console can show the second-Specification warning; the runbook documents that. The production build (`pnpm build` → `dist/`) contains no offline code — `pnpm verify:offline` proves it.

Without offline mode, `pnpm build && pnpm preview` serves `dist/` on localhost:4173; pages, the basket, scenarios and `dataLayer` pushes all work, and GTM/Quadrano only load if the network can reach them.

## Deploy

The shop is served from Cloudflare Pages via Git integration: production branch `main`, build command `pnpm build`, output `dist`. The GTM container ID lives only in the Pages build variable `VITE_GTM_CONTAINER_ID` — never in this repo. `main` changes only by pull request with the `gates` check green.

