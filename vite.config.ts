import { defineConfig, loadEnv, parseSync, transformWithOxc, type Plugin } from 'vite';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isContainerId } from './site/src/container/active-container.ts';

// Multi-page build (FR-001 of the demo-shop mission) plus the GTM install
// (FR-001, FR-002 of this mission; R-01). The head marker is replaced by the
// Results-view capture script (contract console-capture.md), then the inline
// loader whose choice rules come from
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
const CAPTURE_FILE = resolve(import.meta.dirname, 'site/src/results/console-mirror.ts');

const PAGES = {
  listing: 'index.html',
  product: 'product/index.html',
  basket: 'basket/index.html',
  checkout: 'checkout/index.html',
  'thank-you': 'thank-you/index.html',
} as const;

const HEAD_MARKER = '<!-- gtm:head -->';
const BODY_MARKER = '<!-- gtm:body -->';

/**
 * The offline boot step (FR-021, contract demo-shop-offline-mode.md).
 *
 * Injected at `<!-- gtm:head -->` before the GTM loader only when the build
 * mode is `offline`. It reads the snippet the paste panel stored, extracts the
 * `<script>` body and appends it as an inline script, unchanged, so it runs
 * before the page's first `dataLayer.push`. ES5 by construction (it runs
 * inline before anything else). The marker comment is what
 * `scripts/verify-offline.ts` greps the production `dist/` for.
 */
const OFFLINE_BOOT_SCRIPT = String.raw`<script>/* quadrano-demo-shop:offline-mode */
(function () {
  var KEY = 'quadrano-demo-shop.offline-snippet';
  var text; try { text = sessionStorage.getItem(KEY); } catch (e) { return; }
  if (!text) return;
  var match = /<script[^>]*>([\s\S]*?)<\/script>/i.exec(text);
  if (!match) return;
  var s = document.createElement('script');
  s.text = match[1];
  document.head.appendChild(s);
})();</script>`;

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

/**
 * Fails the build if the type-stripped capture script contains post-ES5
 * syntax. The contract (contracts/console-capture.md) requires the emitted
 * script to stay ES5-safe. `transformWithOxc` keeps `var` but rewrites
 * `{ key: key }` to the ES2015 shorthand `{ key }`, so a token scan is not
 * enough: this AST walk flags every post-ES5 construct, including
 * object-property shorthand, computed property names and method shorthand.
 */
function assertEs5Safe(code: string): void {
  const ast = parseSync('console-mirror.js', code);

  const postEs5NodeTypes = new Set([
    'ArrowFunctionExpression',
    'ClassDeclaration',
    'ClassExpression',
    'TemplateLiteral',
    'TaggedTemplateExpression',
    'SpreadElement',
    'RestElement',
    'ObjectPattern',
    'ArrayPattern',
    'AssignmentPattern',
    'ForOfStatement',
    'MetaProperty',
    'Super',
    'YieldExpression',
    'AwaitExpression',
    'ChainExpression',
    'ImportExpression',
  ]);

  function isPostEs5(node: unknown): boolean {
    if (node === null || typeof node !== 'object') {
      return false;
    }
    if (Array.isArray(node)) {
      return node.some(isPostEs5);
    }
    const n = node as Record<string, unknown>;
    const type = typeof n.type === 'string' ? n.type : '';
    if (type !== '' && postEs5NodeTypes.has(type)) {
      return true;
    }
    if (type === 'VariableDeclaration' && n.kind !== 'var') {
      return true;
    }
    if (type === 'Property' && (n.shorthand === true || n.computed === true || n.method === true)) {
      return true;
    }
    if (
      (type === 'FunctionDeclaration' || type === 'FunctionExpression') &&
      (n.generator === true || n.async === true)
    ) {
      return true;
    }
    if (type === 'LogicalExpression' && n.operator === '??') {
      return true;
    }
    if ((type === 'MemberExpression' || type === 'CallExpression') && n.optional === true) {
      return true;
    }
    for (const key of Object.keys(n)) {
      if (key === 'parent' || key === 'start' || key === 'end' || key === 'loc' || key === 'range') {
        continue;
      }
      if (isPostEs5(n[key])) {
        return true;
      }
    }
    return false;
  }

  if (isPostEs5(ast.program)) {
    throw new Error('console-mirror.ts must stay ES5-safe');
  }
}

/**
 * The inline Results-view capture script (contract console-capture.md).
 *
 * Emitted at `<!-- gtm:head -->` before the offline boot step and the GTM
 * loader (R-01): the shop only knows the runtime has loaded by seeing its
 * banner line, so the Console wrappers must be installed before anything else
 * runs. The source is one self-contained ES5-safe file, type-stripped the same
 * way `active-container.ts` is.
 */
async function buildCaptureScript(): Promise<string> {
  const source = await readFile(CAPTURE_FILE, 'utf8');
  const { code } = await transformWithOxc(source, CAPTURE_FILE, { lang: 'ts', sourcemap: false });

  if (/^\s*(?:import|export)\b/m.test(code) || /\bimport\s*\(/.test(code)) {
    throw new Error('console-mirror.ts must stay self-contained (no import/export after inlining)');
  }
  if (/<\/script/i.test(source) || /<\/script/i.test(code)) {
    throw new Error('console-mirror.ts must not contain a closing script tag');
  }
  assertEs5Safe(code);
  for (const name of ['demo-shop:results-view', '__demoShopResults']) {
    if (!code.includes(name)) {
      throw new Error(`console-mirror.ts no longer declares ${name}`);
    }
  }
  if (code.includes('demo-shop:visitor-container') || code.includes('dataLayer')) {
    throw new Error('console-mirror.ts must never touch the container or the data layer (C-002)');
  }

  return code;
}

function gtm(id: string | undefined, offline: boolean): Plugin {
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

  // Built once per production build. The dev server re-reads the rules and the
  // capture script on every page request, so the inlined copies never lag
  // behind the menu's imported ones.
  let rules: Promise<string> | undefined;
  let capture: Promise<string> | undefined;
  let cacheRules = true;

  return {
    name: 'quadrano-gtm',
    configResolved(config) {
      cacheRules = config.command === 'build';
      if (shopId === null) {
        config.logger.warn(
          'VITE_GTM_CONTAINER_ID is not set or not a container ID; pages load no container unless a visitor brings their own.',
        );
      }
    },
    transformIndexHtml: {
      order: 'pre',
      async handler(html, ctx) {
        const rulesCode = await (cacheRules ? (rules ??= buildRulesScript()) : buildRulesScript());
        const captureCode = await (cacheRules ? (capture ??= buildCaptureScript()) : buildCaptureScript());
        const headScript = `<script>(function(){${rulesCode}\n${glue}\n})();</script>`;
        const captureScript = `<script>${captureCode}</script>`;
        // The capture script must run first (R-01): it can only see the
        // runtime's banner line if its Console wrappers are installed before
        // the offline boot step (which injects the stored snippet) and the GTM
        // loader both run.
        const prefix = offline ? OFFLINE_BOOT_SCRIPT : '';
        const withHead = replaceMarker(html, HEAD_MARKER, captureScript + prefix + headScript, ctx.filename);
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
  const offline = mode === 'offline';
  return {
    root: SITE,
    publicDir: resolve(import.meta.dirname, 'public'),
    build: {
      // `vite build --mode offline` writes to `dist-offline/` (FR-021); the
      // production build keeps `dist/`.
      outDir: resolve(import.meta.dirname, offline ? 'dist-offline' : 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        input: Object.fromEntries(
          Object.entries(PAGES).map(([key, path]) => [key, resolve(SITE, path)]),
        ),
      },
    },
    plugins: [gtm(env.VITE_GTM_CONTAINER_ID ?? process.env.VITE_GTM_CONTAINER_ID, offline)],
  };
});
