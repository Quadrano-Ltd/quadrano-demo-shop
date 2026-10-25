import { defineConfig, loadEnv, type Plugin } from 'vite';
import { resolve } from 'node:path';

// Multi-page build (FR-001) plus build-time GTM install (FR-003, R-01).
//
// The GTM container ID comes only from VITE_GTM_CONTAINER_ID in the hosting
// environment (QDR-004); it is never written into this file. A missing or
// unrecognised value warns and emits pages without the GTM tag.

const SITE = resolve(import.meta.dirname, 'site');

const PAGES = {
  listing: 'index.html',
  product: 'product/index.html',
  basket: 'basket/index.html',
  checkout: 'checkout/index.html',
  'thank-you': 'thank-you/index.html',
} as const;

const HEAD_MARKER = '<!-- gtm:head -->';
const BODY_MARKER = '<!-- gtm:body -->';

// Google's published container ID shape; used only to decide whether to emit
// the snippet, never to name the value in any message.
const CONTAINER_ID = /^GTM-[A-Z0-9]{4,10}$/;

function gtm(id: string | undefined): Plugin {
  const trimmed = typeof id === 'string' ? id.trim() : '';
  const ok = CONTAINER_ID.test(trimmed);

  const headSnippet = ok
    ? `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${trimmed}');</script>`
    : '';
  const bodySnippet = ok
    ? `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${trimmed}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`
    : '';

  return {
    name: 'quadrano-gtm',
    configResolved(config) {
      if (!ok) {
        config.logger.warn(
          'VITE_GTM_CONTAINER_ID is not set or not a container ID; building pages without GTM.',
        );
      }
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const withHead = replaceMarker(html, HEAD_MARKER, headSnippet, ctx.filename);
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
