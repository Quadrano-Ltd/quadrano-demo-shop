# Offline snippet fixtures (WP08)

Two real snippets, compiled from the Quadrano compiler for the demo
Specification, committed as fixtures for `e2e/offline-mode.spec.ts`.

- `offline-snippet-before-step8.txt` — the snippet §1.1 step 7 produces.
- `offline-snippet-after-step8.txt` — the same Specification after step 8:
  `coupon`, a required string, is added to `purchase`'s `ecommerce` group, so
  `purchase · Correct` logs `ecommerce.coupon is required, but is missing.`

Both snippets carry the GA4 Event Catalogue's `add_to_cart` and `purchase`
definitions, with `ecommerce.transaction_id` tightened to `^T-[0-9]{6}$`
(FR-024 working pattern).

## Provenance (QDR-001)

Our own compiler output; nothing copied from a non-public source and no prior
venture named.

- Generator: a transient vitest script inside `@quadrano/compiler`
  (`tests/generate-offline-snippets.test.ts`), run and then deleted so it never
  lands in a commit.
- Command: `pnpm --filter @quadrano/compiler exec vitest run tests/generate-offline-snippets.test.ts`
- `quadrano-web` commit: `c15b3af43280a053fce4f14c3014d3e986a43f8b`
- Generated at: 2026-11-03 (UTC)
- `specId`: `abcd2345efgh` (M02 frozen `[a-z2-7]{12}` format)
- `builtAt` (fixed for reproducibility): `2026-11-03T00:00:00.000Z`
