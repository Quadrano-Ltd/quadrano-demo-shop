# Contract: Data layer pushes

Provisional until the W2 freeze (Tue 27 Oct 2026, FR-024). Attribute names and the `transaction_id` pattern are reconciled with the confirmed Event Definitions at that point. This file and `site/src/datalayer/*` change together.

## Sequence per action

Every action makes two `window.dataLayer.push` calls, in this order:

1. `{ ecommerce: null }` (has no `event`, so Quadrano writes nothing: contract §5.8)
2. the event object below

| Action | Where | Event |
|---|---|---|
| Add to basket (product page, listing quick-add) | on click | `add_to_cart` for the added line only (quantity 1) |
| Place order (checkout) | **on thank-you page load**, once per order (research R-03) | `purchase` for the order |

Switching scenario, navigating, and "Order again" push nothing.

> **Event playground** (visitor menu, mission `byo-gtm-container-01M64PAZ`): one button per push in this file — `add_to_cart` and `purchase` in every scenario — makes the same two calls with the same shapes, using the hero product and a fresh transaction id. It pushes nothing else.

## `add_to_cart` (all scenarios)

```js
{
  event: "add_to_cart",
  ecommerce: {
    currency: "GBP",
    value: 12.99,                      // number, price × quantity of the added line
    items: [{ item_id: "SKU-1001", item_name: "<name>", price: 12.99, quantity: 1 }]
  }
}
```

Expected Console group: `✓ add_to_cart`

## `purchase`, correct

```js
{
  event: "purchase",
  ecommerce: {
    transaction_id: "T-104233",        // ^T-[0-9]{6}$
    currency: "GBP",
    value: 12.99,                      // number, basket total
    items: [{ item_id: "SKU-1001", item_name: "<name>", price: 12.99, quantity: 1 }]
  }
}
```

Expected Console group: `✓ purchase`

## `purchase`, broken scenarios (exactly one difference each)

| Scenario id | Difference | Expected Console group (format v1, verbatim) |
|---|---|---|
| `missing-value` | `value` key absent | `✗ purchase · 1 error` / `ecommerce.value is required, but is missing.` |
| `value-as-text` | `value: "12.99"` | `✗ purchase · 1 error` / `ecommerce.value should be a number, but got "12.99".` |
| `wrong-case-key` | `transaction_ID: "T-…"` in place of `transaction_id` | `✗ purchase · 1 error, 1 warning` / `ecommerce.transaction_id is required, but is missing.` / `ecommerce.transaction_ID isn't in the Event Definition. Did you mean transaction_id?` |
| `lowercase-currency` | `currency: "gbp"` | `✗ purchase · 1 error` / `ecommerce.currency should be one of GBP, EUR, USD, but got "gbp".` |
| `bad-transaction-id` (spare) | `transaction_id: "12345"` | `✗ purchase · 1 error` / `ecommerce.transaction_id should match the pattern ^T-[0-9]{6}$, but got "12345".` (the pattern is rendered as the Event Definition holds it) |

## Invariants (checked by `pnpm verify:scenarios`)

- Each broken scenario's object differs from the correct object at exactly one Attribute path, by a deep diff.
- No scenario changes `add_to_cart`.
- The correct `value` equals Σ `price × quantity`, rounded to 2 decimals, and is a number.
- No push object contains a key outside `event` and `ecommerce`.
