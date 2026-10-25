import { PRODUCTS } from '../shop/catalogue.ts';
import { addItem } from '../shop/basket-store.ts';
import { pushAddToCart } from '../datalayer/push.ts';
import { currentScenario, withScenario } from '../switcher/scenario-url.ts';
import { syncScenarioLinks } from '../switcher/switcher.ts';
import { announce, formatPrice, refreshBasketCount, renderLayout } from '../ui/layout.ts';
import { renderArt } from '../ui/art.ts';

const main = renderLayout('listing', 'Shop');

const grid = document.createElement('div');
grid.className = 'product-grid';

for (const product of PRODUCTS) {
  const card = document.createElement('article');
  card.className = 'product-card';

  card.append(renderArt(product.art, product.name));

  const name = document.createElement('h2');
  name.className = 'product-card__name';

  const nameLink = document.createElement('a');
  nameLink.href = withScenario(
    `/product/?id=${encodeURIComponent(product.itemId)}`,
    currentScenario(),
  );
  nameLink.textContent = product.name;
  name.append(nameLink);

  const price = document.createElement('p');
  price.className = 'product-card__price';
  price.textContent = formatPrice(product.pricePence);

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'product-card__add';
  add.textContent = 'Add to basket';
  add.addEventListener('click', () => {
    addItem(product.itemId, 1);
    pushAddToCart({
      itemId: product.itemId,
      name: product.name,
      pricePence: product.pricePence,
      quantity: 1,
    });
    refreshBasketCount();
    announce(`${product.name} added to your basket`);
  });

  card.append(name, price, add);
  grid.append(card);
}

main.append(grid);
syncScenarioLinks(main);
