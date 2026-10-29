import { defineConfig, loadEnv, transformWithOxc, type Plugin } from 'vite';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isContainerId } from './site/src/container/active-container.ts';

// Multi-page build (FR-001 of the demo-shop mission) plus the GTM install
// (FR-001, FR-002 of this mission; R-01). The head marker is replaced by one
// inline loader whose choice rules come from
// site/src/container/active-container.ts (type-stripped at build time) and
// whose glue reads localStorage and runs the standard GTM snippet with the
// chosen ID — always exactly one container, chosen before the first push.
//
// The shop's container ID comes only from VITE_GTM_CONTAINER_ID in the hosting
// environment (QDR-004); it is never written into this file. A missing or
// unrecognised value warns; pages then load no container unless a visitor
// brings their own. The body marker stays a shop-only <noscript> iframe.

const SITE = resolve(import.meta.dirname, 'site');
const RULES_FILE = resolve(import.meta.dirname, 'site/src/container/active-container.ts');

const PAGES = {
  listing: 'index.html',
  product: 'product/index.html',
  basket: 'basket/index.html',
  checkout: 'checkout/index.html',
  'thank-you': 'thank-you/index.html',
} as const;

const HEAD_MARKER = '<!-- gtm:head -->';
const BODY_MARKER = '<!-- gtm:body -->';

async function buildRulesScript(): Promise<string> {
  const source = await readFile(RULES_FILE, 'utf8');
  const { code } = await transformWithOxc(source, RULES_FILE, { lang: 'ts', sourcemap: false });
  const stripped = code.replace(/^export\s+(?=(?:const|function)\b)/gm, '');

  if (/^\s*(?:import|export)\b/m.test(stripped) || /\bimport\s*\(/.test(stripped)) {
    throw new Error('active-container.ts must stay self-contained (no import/export after inlining)');
  }
  if (/<\/script/i.test(stripped)) {
    throw new Error('active-container.ts must not contain a closing script tag');
  }
  if (/\blocation\s*[.[]|\breferrer\b|\bURLSearchParams\b/.test(stripped)) {
    throw new Error('active-container.ts must never read the page address (FR-013)');
  }
  for (const name of ['VISITOR_CONTAINER_KEY', 'chooseContainer']) {
    if (!stripped.includes(name)) {
      throw new Error(`active-container.ts no longer declares ${name}`);
    }
  }

  return stripped;
}

function gtm(id: string | undefined): Plugin {
  const trimmed = typeof id === 'string' ? id.trim() : '';
  const shopId = isContainerId(trimmed) ? trimmed : null;

  const bodySnippet = shopId !== null
    ? `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${shopId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`
    : '';

  const glue = `
var shopId = ${JSON.stringify(shopId)};
var raw = null, storageOk = true;
try { raw = window.localStorage.getItem(VISITOR_CONTAINER_KEY); } catch (e) { storageOk = false; }
var choice = chooseContainer({ raw: raw, storageOk: storageOk, shopId: shopId, now: Date.now() });
if (choice.removeSaved) { try { window.localStorage.removeItem(VISITOR_CONTAINER_KEY); } catch (e) {} }
var root = document.documentElement;
root.setAttribute('data-container-source', choice.source);
if (choice.source === 'visitor' && choice.id) { root.setAttribute('data-visitor-container', choice.id); }
if (!storageOk) { root.setAttribute('data-storage', 'unavailable'); }
if (choice.id) {
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',choice.id);
}`;

  let rules: Promise<string> | undefined;

  return {
    name: 'quadrano-gtm',
    configResolved(config) {
      if (shopId === null) {
        config.logger.warn(
          'VITE_GTM_CONTAINER_ID is not set or not a container ID; pages load no container unless a visitor brings their own.',
        );
      }
    },
    transformIndexHtml: {
      order: 'pre',
      async handler(html, ctx) {
        rules ??= buildRulesScript();
        const rulesCode = await rules;
        const headScript = `<script>(function(){${rulesCode}\n${glue}\n})();</script>`;
        const withHead = replaceMarker(html, HEAD_MARKER, headScript, ctx.filename);
        return replaceMarker(withHead, BODY_MARKER, bodySnippet, ctx.filename);
      },
    },
  };
}

function replaceMarker(
  html: string,
  marker: string,
  replacement: string,
  filename: string,
): string {
  const parts = html.split(marker);
  if (parts.length !== 2) {
    throw new Error(`GTM markers missing in ${filename}`);
  }
  return parts[0] + replacement + parts[1];
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, 'VITE_');
  return {
    root: SITE,
    publicDir: resolve(import.meta.dirname, 'public'),
    build: {
      outDir: resolve(import.meta.dirname, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        input: Object.fromEntries(
          Object.entries(PAGES).map(([key, path]) => [key, resolve(SITE, path)]),
        ),
      },
    },
    plugins: [gtm(env.VITE_GTM_CONTAINER_ID ?? process.env.VITE_GTM_CONTAINER_ID)],
  };
});
