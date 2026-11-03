import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * `pnpm verify:offline` — the FR-021 check (not a gate; see QDR-003, which
 * fixes the gate set to lint → build → no-secrets → provenance, and QDR-007,
 * which reserves Charter amendments to the Architect).
 *
 * Proves the production `dist/` holds no offline-mode code: it greps every
 * built file for the offline boot-step marker and the snippet storage key and
 * exits non-zero if either is found. Run it after `pnpm build`.
 */

const MARKER = 'quadrano-demo-shop:offline-mode';
const STORAGE_KEY = 'quadrano-demo-shop.offline-snippet';
const DIST = resolve(import.meta.dirname, '..', 'dist');

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      out.push(...listFiles(path));
    } else {
      out.push(path);
    }
  }
  return out;
}

function main(): void {
  if (!existsSync(DIST) || !statSync(DIST).isDirectory()) {
    process.stderr.write(
      'verify:offline: dist/ not found — run `pnpm build` first\n',
    );
    process.exit(1);
  }

  const hits: string[] = [];
  for (const file of listFiles(DIST)) {
    let text: string;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    if (text.includes(MARKER)) {
      hits.push(`${file}: ${MARKER}`);
    }
    if (text.includes(STORAGE_KEY)) {
      hits.push(`${file}: ${STORAGE_KEY}`);
    }
  }

  if (hits.length > 0) {
    process.stderr.write(
      'verify:offline: production dist/ contains offline-mode code:\n',
    );
    for (const hit of hits) {
      process.stderr.write(`  ${hit}\n`);
    }
    process.exit(1);
  }

  process.stdout.write(
    'verify:offline: dist/ holds no offline-mode marker or storage key\n',
  );
}

main();
