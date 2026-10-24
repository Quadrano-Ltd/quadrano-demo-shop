# Decision Moment `01M5QXTNC6EKYRJP56QZ5JXSCJ`

- **Mission:** `demo-shop-01M5QW5Y`
- **Origin flow:** `plan`
- **Slot key:** `plan.deploy.pipeline`
- **Input key:** `deploy_pipeline`
- **Status:** `resolved`
- **Created:** `2026-10-24T21:42:18.758206+00:00`
- **Resolved:** `2026-10-24T21:44:16.299069+00:00`
- **Opened by:** `cli`
- **Other answer:** `false`

## Question

How should production deploys run: Cloudflare Pages Git integration building from main (GitHub Actions runs the gates on PRs), or GitHub Actions running the gates then deploying with wrangler?

## Options

- Cloudflare Pages Git integration
- GitHub Actions + wrangler direct upload
- Other

## Final answer

Cloudflare Pages Git integration builds and deploys main; GitHub Actions runs pnpm gates on every push and PR; main changes only via PR with green gates.

## Rationale

_(none)_

## Change log

- `2026-10-24T21:42:18.758206+00:00` — opened
- `2026-10-24T21:44:16.299069+00:00` — resolved (final_answer="Cloudflare Pages Git integration builds and deploys main; GitHub Actions runs pnpm gates on every push and PR; main changes only via PR with green gates.")
