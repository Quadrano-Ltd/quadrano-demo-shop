import { expect, test as base, type Page } from '@playwright/test';

export { expect };

/** The shop's container ID for e2e, built at run time (never a typed literal). */
export const SHOP_CONTAINER_ID = ['GTM', 'SHOPE2E'].join('-');

export const STORAGE_KEY = 'demo-shop:visitor-container';
export const LIFETIME_MS = 86_400_000;
export const PAGES = ['/', '/product/', '/basket/', '/checkout/', '/thank-you/'] as const;

/** A visitor container ID built at run time. */
export function visitorContainerId(tag = 'VISIT01'): string {
  return ['GTM', tag].join('-');
}

export function savedValue(id: string, savedAt: number): string {
  return JSON.stringify({ id, savedAt });
}

export interface GtmRecorder {
  /** `id` query of each gtm.js request, in order. */
  readonly ids: string[];
  /** Any other blocked external URL. */
  readonly external: string[];
  reset(): void;
}

export const test = base.extend<{ gtm: GtmRecorder }>({
  gtm: [
    async ({ context }, use) => {
      const recorder: GtmRecorder = {
        ids: [],
        external: [],
        reset() {
          this.ids.length = 0;
          this.external.length = 0;
        },
      };
      await context.route('**/*', async (route) => {
        const url = route.request().url();
        const hostname = new URL(url).hostname;
        if (hostname === '127.0.0.1' || hostname === 'localhost') {
          await route.continue();
          return;
        }
        if (url.startsWith('https://www.googletagmanager.com/gtm.js?')) {
          recorder.ids.push(new URL(url).searchParams.get('id') ?? '');
          await route.fulfill({
            status: 200,
            contentType: 'application/javascript',
            body: '',
          });
          return;
        }
        recorder.external.push(url);
        await route.abort();
      });
      await use(recorder);
    },
    { auto: true },
  ],
});

/** Save a value under STORAGE_KEY on `/`, then reset the recorder for the next navigation. */
export async function seedSaved(
  page: Page,
  gtm: GtmRecorder,
  value: string,
): Promise<void> {
  await page.goto('/');
  await page.evaluate(
    ([key, item]: readonly [string, string]) => {
      localStorage.setItem(key, item);
    },
    [STORAGE_KEY, value] as const,
  );
  gtm.reset();
}

/** Make the localStorage getter throw before any page script runs. */
export async function blockStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
  });
}

/** `window.dataLayer` minus entries whose event starts with `gtm.`. */
export async function pushedEntries(page: Page): Promise<unknown[]> {
  return page.evaluate(() => {
    const layer = window.dataLayer;
    if (!Array.isArray(layer)) {
      return [];
    }
    return layer.filter((entry) => {
      if (typeof entry !== 'object' || entry === null) {
        return false;
      }
      const event = (entry as { event?: unknown }).event;
      return typeof event !== 'string' || !event.startsWith('gtm.');
    });
  });
}

/** Click "Demo menu" and wait for the panel. */
export async function openMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Demo menu' }).click();
  await page.locator('#visitor-menu').waitFor({ state: 'visible' });
}
