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
| 3 · Wrong-case key | `✗ purchase · 1 error, 1 warning` — missing `transaction_id`, `transaction_ID` not in the Event Definition |
| 4 · Lower-case currency | `✗ purchase · 1 error` — currency should be GBP, EUR or USD |
| Spare · Bad transaction ID | `✗ purchase · 1 error` — transaction_id should match the pattern |

The exact, character-for-character text is in [`kitty-specs/demo-shop-01M5QW5Y/contracts/datalayer-pushes.md`](kitty-specs/demo-shop-01M5QW5Y/contracts/datalayer-pushes.md) — compare against that.

## Before going on stage

Chrome, with DevTools Console open and **"Preserve log" off**, Tag Assistant connected, and the "Demo Shop" Specification's tag installed in the shop's GTM container.

## If the venue network fails

```bash
pnpm build && pnpm preview   # serves dist/ on localhost
```

Pages, the basket, scenarios and `dataLayer` pushes all work offline. GTM and Quadrano only load if the network can reach them, so on-stage verdicts need network (or a locally served GTM).

## Deploy

The shop is served from Cloudflare Pages via Git integration: production branch `main`, build command `pnpm build`, output `dist`. The GTM container ID lives only in the Pages build variable `VITE_GTM_CONTAINER_ID` — never in this repo. `main` changes only by pull request with the `gates` check green.

