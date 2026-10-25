# Data Model: Demo Shop

All state is client-side. "Attribute" means a key in a pushed event object (Terminology Canon).

## Product (static catalogue, `site/src/shop/catalogue.ts`)

| Field | Type | Rules |
|---|---|---|
| `itemId` | string | Unique, e.g. `SKU-1001`. Becomes the `item_id` Attribute. |
| `name` | string | Fictional (C-010). Becomes `item_name`. |
| `pricePence` | integer | > 0. The hero product is `1299` (R-05). |
| `art` | SVG id | Original inline art. |

There are about four products, and the first one listed is the hero product.

## Basket (`demo-shop:basket`, sessionStorage with an in-memory fallback)

| Field | Type | Rules |
|---|---|---|
| `lines` | `{ itemId, quantity }[]` | `quantity` is an integer ≥ 1. One line per `itemId`, and adding again increments it. |

Derived: `totalPence = Σ pricePence × quantity`. Invariant: an empty basket cannot place an order, because the checkout button is disabled.

## Order (`demo-shop:order`)

| Field | Type | Rules |
|---|---|---|
| `transactionId` | string | `T-` followed by 6 digits (`TRANSACTION_ID_PATTERN`), generated at "Place order". |
| `lines` | `{ itemId, name, pricePence, quantity }[]` | Snapshot of the basket. |
| `totalPence` | integer | Snapshot. |
| `scenario` | `ScenarioId` | Active when "Place order" was pressed. |
| `pushed` | boolean | Lifecycle below. |

### Order lifecycle

```mermaid
stateDiagram-v2
  [*] --> Placed: Place order (basket non-empty) / save order, clear basket, go to thank-you
  Placed --> Pushed: thank-you load / push {ecommerce:null}, push purchase
  Pushed --> Pushed: reload, back/forward / no push
  Pushed --> [*]: Order again / restore lines to basket (no push)
```

Atomicity: `pushed` is set to true in the same synchronous task as the push, so a crash between them cannot happen in a way that leads to a double push.

## Scenario (`site/src/datalayer/scenarios.ts`)

| Field | Type | Rules |
|---|---|---|
| `id` | `ScenarioId` | URL-safe slug, unique. |
| `label` | string | Shown in the control, with no verdict wording (R-08). |
| `order` | integer | Talk-script position. |
| `talkScript` | boolean | `false` only for the spare. |
| `apply` | `(correct: PurchasePush) => object` | Returns a copy that differs in exactly one way (FR-012). Never mutates its input. |

| order | id | label | One difference |
|---|---|---|---|
| 0 | `correct` | Correct | none |
| 1 | `missing-value` | 1 · Missing value | remove `ecommerce.value` |
| 2 | `value-as-text` | 2 · Value as text | `ecommerce.value = "12.99"` |
| 3 | `wrong-case-key` | 3 · Wrong-case key | rename `ecommerce.transaction_id` → `ecommerce.transaction_ID` (same value) |
| 4 | `lowercase-currency` | 4 · Lower-case currency | `ecommerce.currency = "gbp"` |
| 5 | `bad-transaction-id` | Spare · Bad transaction ID | `ecommerce.transaction_id = "12345"` |

Scenarios never affect `add_to_cart` (US2 scenario 2).

## Event push

The exact objects are in [contracts/datalayer-pushes.md](contracts/datalayer-pushes.md). Each push is preceded by `{ ecommerce: null }`, and the push module is the only writer to `window.dataLayer`.
