# Decision Moment `01M5QWAQP6Q5KKQSQDFFNG0XYJ`

- **Mission:** `demo-shop-01M5QW5Y`
- **Origin flow:** `specify`
- **Slot key:** `specify.data-layer.attribute-shape`
- **Input key:** `attribute_shape`
- **Status:** `resolved`
- **Created:** `2026-10-24T21:16:08.262539+00:00`
- **Resolved:** `2026-10-24T21:18:37.505437+00:00`
- **Opened by:** `cli`
- **Other answer:** `false`

## Question

What shape do add_to_cart and purchase pushes take: flat top-level Attributes (value, currency, transaction_id beside event) or GA4 ecommerce-nested (ecommerce.value, ecommerce.items[])? And which Attributes does add_to_cart carry?

## Options

- Flat top-level Attributes
- GA4 ecommerce-nested
- Defer to W2 freeze (27 Oct)
- Other

## Final answer

GA4 ecommerce-nested. add_to_cart: ecommerce.currency, ecommerce.value, ecommerce.items[] (item_id, item_name, price, quantity); purchase adds ecommerce.transaction_id. Each ecommerce push preceded by {ecommerce: null}. Exact Attribute names provisional until W2 freeze Tue 27 Oct.

## Rationale

_(none)_

## Change log

- `2026-10-24T21:16:08.262539+00:00` — opened
- `2026-10-24T21:18:37.505437+00:00` — resolved (final_answer="GA4 ecommerce-nested. add_to_cart: ecommerce.currency, ecommerce.value, ecommerce.items[] (item_id, item_name, price, quantity); purchase adds ecommerce.transaction_id. Each ecommerce push preceded by {ecommerce: null}. Exact Attribute names provisional until W2 freeze Tue 27 Oct.")
