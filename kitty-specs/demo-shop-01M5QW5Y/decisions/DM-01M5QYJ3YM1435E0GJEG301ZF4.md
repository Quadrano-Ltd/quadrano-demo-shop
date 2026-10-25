# Decision Moment `01M5QYJ3YM1435E0GJEG301ZF4`

- **Mission:** `demo-shop-01M5QW5Y`
- **Origin flow:** `plan`
- **Slot key:** `plan.tooling.node-types`
- **Input key:** `node_types`
- **Status:** `resolved`
- **Created:** `2026-10-24T21:55:07.348890+00:00`
- **Resolved:** `2026-10-24T21:55:21.959654+00:00`
- **Resolved by:** `Product Owner`
- **Opened by:** `cli`
- **Other answer:** `false`

## Question

Is @types/node (type-only, no runtime code) covered by C-009 so that gate scripts and vite.config.ts get full tsc and type-aware lint checking?

## Options

- Yes, covered by C-009
- No, keep five packages and exclude scripts from type checking
- Needs a Charter amendment

## Final answer

Yes, covered by C-009: @types/node allowed as a type-only dev dependency, pinned, recorded in AGENTS.md; scripts/ and vite.config.ts are fully type-checked and type-aware linted.

## Rationale

Type definitions only; no runtime code and nothing shipped to the browser. Confirmed by the Product Owner at /spec-kitty.tasks.

## Change log

- `2026-10-24T21:55:07.348890+00:00` — opened
- `2026-10-24T21:55:21.959654+00:00` — resolved (final_answer="Yes, covered by C-009: @types/node allowed as a type-only dev dependency, pinned, recorded in AGENTS.md; scripts/ and vite.config.ts are fully type-checked and type-aware linted.")
