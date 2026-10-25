import { getProductOrHero } from '../shop/catalogue.ts';
import { addItem } from '../shop/basket-store.ts';
import { pushAddToCart } from '../datalayer/push.ts';
import { currentScenario, withScenario } from '../switcher/scenario-url.ts';
import { syncScenarioLinks } from '../switcher/switcher.ts';
import { announce, formatPrice, refreshBasketCount, renderLayout } from '../ui/layout.ts';
import { renderArt } from '../ui/art.ts';

// An unknown or missing id shows the hero product (contracts/scenario-url.md).
const product = getProductOrHero(new URLSearchParams(window.location.search).get('id'));

const main = renderLayout('product', product.name);

const article = document.createElement('article');
article.className = 'product-page';

article.append(renderArt(product.art, product.name));

const price = document.createElement('p');
price.className = 'product-page__price';
price.textContent = formatPrice(product.pricePence);

const blurb = document.createElement('p');
blurb.className = 'product-page__blurb';
blurb.textContent = product.blurb;

const add = document.createElement('button');
add.type = 'button';
add.className = 'product-page__add';
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

const actions = document.createElement('p');
actions.className = 'product-page__actions';

const viewBasket = document.createElement('a');
viewBasket.className = 'button-link';
viewBasket.href = withScenario('/basket/', currentScenario());
viewBasket.textContent = 'View basket';

actions.append(viewBasket);
article.append(price, blurb, add, actions);
main.append(article);
syncScenarioLinks(main);
