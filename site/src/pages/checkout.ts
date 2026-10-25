import { getLines, isEmpty, totalPence } from '../shop/basket-store.ts';
import { getProduct } from '../shop/catalogue.ts';
import { placeOrder } from '../shop/order-store.ts';
import { newTransactionId } from '../datalayer/events.ts';
import { getScenario } from '../datalayer/scenarios.ts';
import { currentScenario, withScenario } from '../switcher/scenario-url.ts';
import { SCENARIO_CHANGE_EVENT, syncScenarioLinks } from '../switcher/switcher.ts';
import { formatPrice, renderLayout } from '../ui/layout.ts';

const main = renderLayout('checkout', 'Checkout');

const scenarioLine = document.createElement('p');
scenarioLine.className = 'checkout__scenario';

const summary = document.createElement('div');
summary.className = 'checkout__summary';

const delivery = document.createElement('p');
delivery.className = 'checkout__delivery';
delivery.textContent = 'Delivery: Standard (free)';

const note = document.createElement('p');
note.className = 'checkout__note';
note.textContent = 'No payment is taken: this is a demo.';

const place = document.createElement('button');
place.type = 'button';
place.className = 'checkout__place';
place.textContent = 'Place order';

function updateScenarioLine(): void {
  scenarioLine.textContent = `Scenario: ${getScenario(currentScenario()).label}`;
}

function renderSummary(): void {
  summary.replaceChildren();
  const lines = getLines();

  if (isEmpty()) {
    const empty = document.createElement('p');
    empty.className = 'checkout__empty';
    empty.textContent = 'Your basket is empty.';

    const shop = document.createElement('p');
    const shopLink = document.createElement('a');
    shopLink.href = withScenario('/', currentScenario());
    shopLink.textContent = 'Back to the shop';
    shop.append(shopLink);

    summary.append(empty, shop);
    return;
  }

  const list = document.createElement('ul');
  list.className = 'checkout__lines';

  for (const line of lines) {
    const product = getProduct(line.itemId);
    if (product === undefined) {
      continue;
    }
    const item = document.createElement('li');
    item.textContent = `${product.name} × ${String(line.quantity)} — ${formatPrice(
      product.pricePence * line.quantity,
    )}`;
    list.append(item);
  }

  const total = document.createElement('p');
  total.className = 'checkout__total';
  total.textContent = `Total: ${formatPrice(totalPence())}`;

  summary.append(list, total);
}

function refreshCheckout(): void {
  renderSummary();
  place.disabled = isEmpty();
}

place.addEventListener('click', () => {
  place.disabled = true;
  // The scenario that applies to this order is the one active at the moment
  // Place order is pressed (R-04).
  const scenario = currentScenario();
  const order = placeOrder({ transactionId: newTransactionId(), scenario });
  if (order === undefined) {
    place.disabled = false;
    return;
  }
  // No purchase push here: it happens on the thank-you page load (R-03).
  window.location.assign(withScenario('/thank-you/', scenario));
});

document.addEventListener(SCENARIO_CHANGE_EVENT, () => {
  updateScenarioLine();
  syncScenarioLinks(main);
});

main.append(scenarioLine, summary, delivery, note, place);
updateScenarioLine();
refreshCheckout();
syncScenarioLinks(main);
