# Contract: Scenario link format and switcher

## Link format

```
https://demo.quadrano.com/<page>?scenario=<scenario-id>[&id=<item_id>]
```

| `<page>` | Page |
|---|---|
| `/` | Product listing |
| `/product/?id=SKU-1001` | Product page (an unknown or missing `id` shows the hero product) |
| `/basket/` | Basket |
| `/checkout/` | Checkout |
| `/thank-you/` | Thank-you |

`<scenario-id>` is one of `correct`, `missing-value`, `value-as-text`, `wrong-case-key`, `lowercase-currency` or `bad-transaction-id`. A missing or unknown value means `correct`, and the address is normalised with `history.replaceState` (no new history entry).

## On-page control

- A native `<select>`, labelled "Scenario", appears in the header of every page. Its options follow talk-script order: correct, 1–4, then the spare.
- When it changes, `history.pushState` updates the URL, the header nav links are rewritten, and the page re-renders any scenario label. **No `dataLayer` push** (FR-015).
- `popstate` re-reads the URL and syncs the control (back/forward edge case).
- Every internal link carries the current `scenario`.
- It is keyboard operable and has a visible focus ring (NFR-005).

## Two-interaction rule (NFR-002)

From any page: (1) choose the scenario in the control, (2) click the page in the header nav. A bookmark reaches the same state in one interaction.

## Talk bookmarks (for quickstart)

| Step | Link |
|---|---|
| Start | `/?scenario=correct` |
| Hero product | `/product/?id=SKU-1001&scenario=correct` |
| Broken 1–4 / spare | `/checkout/?scenario=<id>` (after a basket exists, or use "Order again") |
