import { itemCount } from '../shop/basket-store.ts';
import { SHOP_NAME } from '../shop/catalogue.ts';
import { createVisitorBanner, readContainerState } from '../menu/banner.ts';
import { mountVisitorMenu } from '../menu/visitor-menu.ts';
import { currentScenario, withScenario } from '../switcher/scenario-url.ts';
import { mountScenarioSwitcher, syncScenarioLinks } from '../switcher/switcher.ts';

/**
 * Shared page chrome: header (wordmark, nav, scenario control), <main>, footer
 * and a polite live region. Links are built through withScenario so every
 * internal link carries the current scenario (FR-013/014).
 */

export type PageId = 'listing' | 'product' | 'basket' | 'checkout' | 'thank-you';

interface NavItem {
  readonly id: PageId;
  readonly href: string;
  readonly label: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'listing', href: '/', label: 'Shop' },
  { id: 'basket', href: '/basket/', label: 'Basket' },
  { id: 'checkout', href: '/checkout/', label: 'Checkout' },
];

const priceFormat = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

let basketBadge: HTMLElement | null = null;
let liveRegion: HTMLElement | null = null;

export function formatPrice(pence: number): string {
  return priceFormat.format(pence / 100);
}

export function refreshBasketCount(): void {
  if (basketBadge !== null) {
    basketBadge.textContent = String(itemCount());
  }
}

export function announce(message: string): void {
  if (liveRegion === null) {
    return;
  }
  // Clear first so a repeated message (same product added twice) is still
  // announced by assistive technology.
  liveRegion.textContent = '';
  liveRegion.textContent = message;
}

export function renderLayout(page: PageId, heading: string): HTMLElement {
  const app = document.querySelector<HTMLElement>('#app');
  if (app === null) {
    throw new Error('Missing #app root');
  }

  // Mount the switcher first: it normalises the address, so links built next
  // read the settled scenario.
  const switcherContainer = document.createElement('div');
  switcherContainer.className = 'site-header__switcher';
  mountScenarioSwitcher(switcherContainer);

  const header = document.createElement('header');
  header.className = 'site-header';

  const wordmark = document.createElement('a');
  wordmark.className = 'site-header__wordmark';
  wordmark.href = withScenario('/', currentScenario());
  wordmark.textContent = SHOP_NAME;

  const nav = document.createElement('nav');
  nav.className = 'site-header__nav';
  nav.setAttribute('aria-label', 'Site');

  const list = document.createElement('ul');
  for (const item of NAV_ITEMS) {
    const entry = document.createElement('li');
    const link = document.createElement('a');
    link.href = withScenario(item.href, currentScenario());
    link.textContent = item.label;
    if (item.id === page) {
      link.setAttribute('aria-current', 'page');
    }
    if (item.id === 'basket') {
      const badge = document.createElement('span');
      badge.className = 'site-header__badge';
      badge.textContent = String(itemCount());
      basketBadge = badge;
      link.append(' ', badge);
    }
    entry.append(link);
    list.append(entry);
  }
  nav.append(list);

  header.append(wordmark, nav, switcherContainer);

  const main = document.createElement('main');
  main.className = 'site-main';

  const title = document.createElement('h1');
  title.textContent = heading;
  main.append(title);

  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  const footerLine = document.createElement('p');
  footerLine.textContent = 'A fictional shop for a live demo. Nothing here is for sale.';
  footer.append(footerLine);

  const live = document.createElement('p');
  live.className = 'visually-hidden';
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('role', 'status');
  liveRegion = live;

  const banner = createVisitorBanner(readContainerState());
  app.replaceChildren(...(banner === null ? [] : [banner]), header, main, footer, live);

  mountVisitorMenu(announce);

  syncScenarioLinks(document);

  return main;
}
