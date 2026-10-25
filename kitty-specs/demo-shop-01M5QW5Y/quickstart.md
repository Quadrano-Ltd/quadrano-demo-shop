# Quickstart: Demo Shop

## Prerequisites

- Node 24 LTS (per `.node-version`) and pnpm (per `packageManager`, through `corepack enable`).
- A provenance denylist at `~/.quadrano/provenance-denylist.txt` (or set `QUADRANO_DENYLIST_PATH`). It is held outside the repo, and the gate fails without it.

## Develop

```bash
pnpm install            # also installs the pre-push hook (core.hooksPath)
pnpm dev                # Vite dev server; no GTM unless VITE_GTM_CONTAINER_ID is set in .env.local (gitignored)
pnpm gates              # lint → build → no-secrets → provenance
pnpm verify:scenarios   # FR-012 one-difference check
```

## Deploy (one-time Cloudflare Pages setup, done by the Product Owner)

1. Create a Pages project connected to `Quadrano-Ltd/quadrano-demo-shop`. Production branch `main`, build command `pnpm build`, output `dist`.
2. Set `VITE_GTM_CONTAINER_ID` as a Production variable (encrypted). Do not put it anywhere in the repo.
3. Add the custom domain `demo.quadrano.com`.
4. On GitHub, add the `PROVENANCE_DENYLIST` repository secret and protect `main` with the *gates* check required.
5. On the first deploy, confirm the build log shows Node 24 and the pinned pnpm, and no blocked-postinstall error (research A7).

## Local fallback (venue network failure, FR-022)

```bash
pnpm build && pnpm preview   # serves dist/ on localhost
```

Pages, the basket, scenarios and `dataLayer` pushes all work offline. GTM and Quadrano only load if the network can reach them. Check pushes with `dataLayer` in the Console.

## Pre-rehearsal check (NFR-003: run 10 times, record results)

Setup: Chrome with DevTools Console open, "Preserve log" **off**, Tag Assistant connected, and the "Demo Shop" Specification's tag in the container.

| # | Steps | Expect (Console, verbatim) |
|---|---|---|
| 1 | `/product/?id=SKU-1001&scenario=correct`, then Add to basket | `✓ add_to_cart` |
| 2 | Checkout, then Place order | `✓ purchase` on thank-you |
| 3 | Order again, choose `1 · Missing value`, then Place order | `✗ purchase · 1 error` / `ecommerce.value is required, but is missing.` |
| 4 | Order again, `2 · Value as text`, Place order | `… should be a number, but got "12.99".` |
| 5 | Order again, `3 · Wrong-case key`, Place order | `✗ purchase · 1 error, 1 warning` + both lines |
| 6 | Order again, `4 · Lower-case currency`, Place order | `… should be one of GBP, EUR, USD, but got "gbp".` |
| 7 | Order again, `Spare · Bad transaction ID`, Place order | `… should match the pattern …, but got "12345".` |
| 8 | Reload thank-you | no new Console group |
| 9 | Switch scenario on any page | no new Console group, and the URL changes |
| 10 | Remove the Quadrano tag (or use a Preview workspace without it) and repeat 1–2 | events in Tag Assistant, **no** verdict lines (SC-002) |

The full expected text is in [contracts/datalayer-pushes.md](contracts/datalayer-pushes.md). Compare character for character.

## After the W2 freeze (Tue 27 Oct, FR-024)

Compare the confirmed `add_to_cart` / `purchase` Event Definitions with [contracts/datalayer-pushes.md](contracts/datalayer-pushes.md). Update the contract, `site/src/datalayer/*` and `TRANSACTION_ID_PATTERN` together, then re-run `pnpm verify:scenarios` and the pre-rehearsal check.
