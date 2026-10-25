# Decision Moment `01M5QXTQXTG6ASW9E96GQM6ARX`

- **Mission:** `demo-shop-01M5QW5Y`
- **Origin flow:** `plan`
- **Slot key:** `plan.tooling.supporting-dev-deps`
- **Input key:** `supporting_dev_deps`
- **Status:** `resolved`
- **Created:** `2026-10-24T21:42:21.370099+00:00`
- **Resolved:** `2026-10-24T21:44:18.842263+00:00`
- **Opened by:** `cli`
- **Other answer:** `false`

## Question

Does C-009 (pnpm, Vite, TypeScript, ESLint) cover the supporting dev dependencies typescript-eslint and @eslint/js, with gate scripts written in TypeScript run by Node 24 LTS native type stripping (no tsx, husky or gitleaks)?

## Options

- Yes, covered by C-009
- No, needs a Charter amendment
- Other

## Final answer

Yes, covered by C-009: typescript-eslint and @eslint/js allowed; gate scripts in TypeScript run by Node 24 LTS native type stripping; no tsx, husky or gitleaks; pre-push hook via core.hooksPath.

## Rationale

_(none)_

## Change log

- `2026-10-24T21:42:21.370099+00:00` — opened
- `2026-10-24T21:44:18.842263+00:00` — resolved (final_answer="Yes, covered by C-009: typescript-eslint and @eslint/js allowed; gate scripts in TypeScript run by Node 24 LTS native type stripping; no tsx, husky or gitleaks; pre-push hook via core.hooksPath.")
