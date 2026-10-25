import { getOrder, orderAgain, takeUnpushedOrder } from '../shop/order-store.ts';
import { pushPurchase } from '../datalayer/push.ts';
import { DEFAULT_SCENARIO_ID, isScenarioId } from '../datalayer/scenarios.ts';
import { currentScenario, withScenario } from '../switcher/scenario-url.ts';
import { syncScenarioLinks } from '../switcher/switcher.ts';
import { formatPrice, renderLayout } from '../ui/layout.ts';

// The purchase push must stay in the same synchronous task as
// takeUnpushedOrder (data-model "Atomicity"): no await, timer or event
// between marking the order pushed and pushing it (R-03).
const fresh = takeUnpushedOrder();
if (fresh !== undefined) {
  const scenario = isScenarioId(fresh.scenario) ? fresh.scenario : DEFAULT_SCENARIO_ID;
  pushPurchase({ transactionId: fresh.transactionId, lines: fresh.lines, scenario });
}
const order = fresh ?? getOrder();

const main = renderLayout('thank-you', 'Thank you');

if (order !== undefined) {
  const thanks = document.createElement('p');
  thanks.className = 'thank-you__message';
  thanks.textContent = 'Thank you for your order.';

  const reference = document.createElement('p');
  reference.className = 'thank-you__ref';
  reference.textContent = `Order reference: ${order.transactionId}`;

  const list = document.createElement('ul');
  list.className = 'thank-you__lines';
  for (const line of order.lines) {
    const item = document.createElement('li');
    item.textContent = `${line.name} × ${String(line.quantity)} — ${formatPrice(
      line.pricePence * line.quantity,
    )}`;
    list.append(item);
  }

  const total = document.createElement('p');
  total.className = 'thank-you__total';
  total.textContent = `Total: ${formatPrice(order.totalPence)}`;

  const actions = document.createElement('p');
  actions.className = 'thank-you__actions';

  const again = document.createElement('button');
  again.type = 'button';
  again.className = 'thank-you__again';
  again.textContent = 'Order again';
  again.addEventListener('click', () => {
    // Restores the last order's lines to the basket; no push (R-07).
    orderAgain();
    window.location.assign(withScenario('/checkout/', currentScenario()));
  });

  const continueLink = document.createElement('a');
  continueLink.href = withScenario('/', currentScenario());
  continueLink.textContent = 'Continue shopping';

  actions.append(again, ' ', continueLink);
  main.append(thanks, reference, list, total, actions);
} else {
  const none = document.createElement('p');
  none.className = 'thank-you__none';
  none.textContent = 'No recent order.';

  const shop = document.createElement('p');
  const shopLink = document.createElement('a');
  shopLink.href = withScenario('/', currentScenario());
  shopLink.textContent = 'Back to the shop';
  shop.append(shopLink);

  main.append(none, shop);
}

syncScenarioLinks(main);
