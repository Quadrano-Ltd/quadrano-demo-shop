# Contract: Playground pushes

Requirements: FR-014 to FR-018, FR-026; C-003. Shapes and expected Console groups are defined by `kitty-specs/demo-shop-01M5QW5Y/contracts/datalayer-pushes.md`, and that file stays the single description of every push. This contract only maps buttons to calls.

`site/src/menu/playground.ts` imports `pushAddToCart` and `pushPurchase` from `push.ts`, `newTransactionId` from `events.ts`, `SCENARIOS` from `scenarios.ts` and the hero product from `catalogue.ts`. It never touches `dataLayer` itself (existing lint).

`hero` = `{ itemId: 'SKU-1001', name: 'Stoneware Mug', pricePence: 1299, quantity: 1 }`, built from `getProductOrHero(HERO_PRODUCT_ID)`.

| # | Button label | Call | Contract section |
|---|---|---|---|
| 1 | `add_to_cart` | `pushAddToCart(hero)` | `add_to_cart` |
| 2 | `purchase · Correct` | `pushPurchase({ transactionId: newTransactionId(), lines: [hero], scenario: 'correct' })` | `purchase`, correct |
| 3 | `purchase · 1 · Missing value` | `… scenario: 'missing-value'` | broken: `missing-value` |
| 4 | `purchase · 2 · Value as text` | `… scenario: 'value-as-text'` | broken: `value-as-text` |
| 5 | `purchase · 3 · Wrong-case key` | `… scenario: 'wrong-case-key'` | broken: `wrong-case-key` |
| 6 | `purchase · 4 · Lower-case currency` | `… scenario: 'lowercase-currency'` | broken: `lowercase-currency` |
| 7 | `purchase · Spare · Bad transaction ID` | `… scenario: 'bad-transaction-id'` | broken: `bad-transaction-id` |

Buttons 2 to 7 come from iterating `SCENARIOS` in order, labelled `purchase · ${scenario.label}`, so a scenario added later can't be missing from the playground.

## Per press

- Exactly one `push.ts` call. The data layer then gains exactly 2 entries: `{ ecommerce: null }` and the event.
- The live region announces "Pushed <button label>". That is neutral wording, with no verdict.
- No change to `?scenario=`, the switcher, the basket, the order store or storage.

## Note added to the demo-shop push contract (FR-026)

Under "Sequence per action", in `kitty-specs/demo-shop-01M5QW5Y/contracts/datalayer-pushes.md`:

> **Event playground** (visitor menu, mission `byo-gtm-container-01M64PAZ`): one button per push in this file — `add_to_cart` and `purchase` in every scenario — makes the same two calls with the same shapes, using the hero product and a fresh transaction id. It pushes nothing else.
