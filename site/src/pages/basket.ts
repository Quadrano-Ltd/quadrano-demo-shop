import { getLines, isEmpty, removeItem, totalPence } from '../shop/basket-store.ts';
import { getProduct } from '../shop/catalogue.ts';
import { currentScenario, withScenario } from '../switcher/scenario-url.ts';
import { syncScenarioLinks } from '../switcher/switcher.ts';
import { announce, formatPrice, refreshBasketCount, renderLayout } from '../ui/layout.ts';
import { renderArt } from '../ui/art.ts';

const main = renderLayout('basket', 'Your basket');

const container = document.createElement('div');
container.className = 'basket';
main.append(container);

function renderBasket(): void {
  container.replaceChildren();
  const lines = getLines();

  if (isEmpty()) {
    const empty = document.createElement('p');
    empty.className = 'basket__empty';
    empty.textContent = 'Your basket is empty.';

    const shop = document.createElement('p');
    const shopLink = document.createElement('a');
    shopLink.href = withScenario('/', currentScenario());
    shopLink.textContent = 'Back to the shop';
    shop.append(shopLink);

    container.append(empty, shop);
    return;
  }

  const list = document.createElement('ul');
  list.className = 'basket__lines';

  for (const line of lines) {
    const product = getProduct(line.itemId);
    if (product === undefined) {
      continue;
    }

    const item = document.createElement('li');
    item.className = 'basket__line';

    const thumb = document.createElement('span');
    thumb.className = 'basket__thumb';
    thumb.append(renderArt(product.art, product.name));

    const name = document.createElement('span');
    name.className = 'basket__name';
    name.textContent = product.name;

    const unit = document.createElement('span');
    unit.className = 'basket__unit';
    unit.textContent = `${formatPrice(product.pricePence)} each`;

    const quantity = document.createElement('span');
    quantity.className = 'basket__qty';
    quantity.textContent = `Quantity: ${String(line.quantity)}`;

    const total = document.createElement('span');
    total.className = 'basket__total';
    total.textContent = formatPrice(product.pricePence * line.quantity);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'basket__remove';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => {
      removeItem(line.itemId);
      renderBasket();
      refreshBasketCount();
      announce(`${product.name} removed from your basket`);
      syncScenarioLinks(main);
    });

    item.append(thumb, name, unit, quantity, total, remove);
    list.append(item);
  }

  const totalRow = document.createElement('p');
  totalRow.className = 'basket__total-row';
  totalRow.textContent = `Total: ${formatPrice(totalPence())}`;

  const checkout = document.createElement('p');
  checkout.className = 'basket__checkout';
  const checkoutLink = document.createElement('a');
  checkoutLink.className = 'button-link';
  checkoutLink.href = withScenario('/checkout/', currentScenario());
  checkoutLink.textContent = 'Go to checkout';
  checkout.append(checkoutLink);

  container.append(list, totalRow, checkout);
}

renderBasket();
syncScenarioLinks(main);
