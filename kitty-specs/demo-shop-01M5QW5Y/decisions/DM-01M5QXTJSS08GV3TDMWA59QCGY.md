# Decision Moment `01M5QXTJSS08GV3TDMWA59QCGY`

- **Mission:** `demo-shop-01M5QW5Y`
- **Origin flow:** `plan`
- **Slot key:** `plan.deploy.gtm-id-injection`
- **Input key:** `gtm_id_injection`
- **Status:** `resolved`
- **Created:** `2026-10-24T21:42:16.121008+00:00`
- **Resolved:** `2026-10-24T21:44:13.501905+00:00`
- **Opened by:** `cli`
- **Other answer:** `false`

## Question

How should the GTM container ID reach the served pages: baked in at build time from a Cloudflare Pages build environment variable, or injected per request by a Cloudflare Pages Function?

## Options

- Build-time Cloudflare Pages env var
- Per-request Pages Function
- Other

## Final answer

Build-time Cloudflare Pages env var (VITE_GTM_CONTAINER_ID) baked into built HTML by Vite; never in repo; missing ID builds pages without GTM.

## Rationale

_(none)_

## Change log

- `2026-10-24T21:42:16.121008+00:00` — opened
- `2026-10-24T21:44:13.501905+00:00` — resolved (final_answer="Build-time Cloudflare Pages env var (VITE_GTM_CONTAINER_ID) baked into built HTML by Vite; never in repo; missing ID builds pages without GTM.")
