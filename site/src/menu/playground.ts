import {
  pushAddToCart,
  pushPurchase,
} from '../datalayer/push.ts';
import { newTransactionId, type PushLine } from '../datalayer/events.ts';
import { SCENARIOS } from '../datalayer/scenarios.ts';
import { getProductOrHero, HERO_PRODUCT_ID } from '../shop/catalogue.ts';

/**
 * The event playground (FR-014): one button per existing push, in the
 * contract's order. Each press makes exactly one push through push.ts, so
 * shapes are unchanged by construction (FR-015, FR-016, C-003).
 *
 * This module never touches `dataLayer`, never reads the address or the
 * scenario switcher, and never changes the basket, the order store or storage.
 * `announce` is injected so this module does not import `ui/layout.ts`
 * (WP06 mounts it inside the visitor menu panel).
 */

function heroLine(): PushLine {
  const hero = getProductOrHero(HERO_PRODUCT_ID);
  return {
    itemId: hero.itemId,
    name: hero.name,
    pricePence: hero.pricePence,
    quantity: 1,
  };
}

interface PlaygroundEntry {
  readonly label: string;
  readonly press: () => void;
}

/** Button 1 plus buttons 2 to 7 derived from `SCENARIOS` in order. */
function entries(): readonly PlaygroundEntry[] {
  const line = heroLine();
  return [
    { label: 'add_to_cart', press: () => pushAddToCart(line) },
    ...SCENARIOS.map((scenario) => ({
      label: `purchase · ${scenario.label}`,
      press: () =>
        pushPurchase({
          transactionId: newTransactionId(),
          lines: [line],
          scenario: scenario.id,
        }),
    })),
  ];
}

/**
 * Renders the event playground into `container`: one button per existing push
 * (FR-014). Each press makes exactly one push through push.ts (FR-015). Safe to
 * call twice: the second call does nothing.
 */
export function mountPlayground(
  container: HTMLElement,
  announce: (message: string) => void,
): void {
  if (container.dataset.playgroundMounted === 'true') {
    return;
  }
  container.dataset.playgroundMounted = 'true';

  const intro = document.createElement('p');
  intro.className = 'playground__intro';
  intro.textContent = 'Each button makes one push to the data layer.';

  const list = document.createElement('ul');
  list.className = 'playground__list';

  for (const entry of entries()) {
    const item = document.createElement('li');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'playground__button';
    button.textContent = entry.label;
    button.addEventListener('click', () => {
      entry.press();
      announce(`Pushed ${entry.label}`);
    });

    item.append(button);
    list.append(item);
  }

  container.append(intro, list);
}
