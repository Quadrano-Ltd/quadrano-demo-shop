import { readFileSync } from 'node:fs';
import * as git from './lib/git.ts';
import { finding, finish, mask } from './lib/report.ts';

const GTM_ALLOWLIST = 'GTM-XXXXXXX';

interface Pattern {
  name: string;
  regex: RegExp;
  requireKeyword?: RegExp;
}

const patterns: Pattern[] = [
  { name: 'gtm-container-id', regex: /\bGTM-[A-Z0-9]{4,10}\b/g },
  { name: 'private-key', regex: /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/g },
  { name: 'aws-access-key-id', regex: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
  {
    name: 'cloudflare-token-like',
    regex: /\b[A-Za-z0-9_-]{40}\b/g,
    requireKeyword: /\b(?:token|key|secret)s?\b/i,
  },
  {
    name: 'generic-assignment',
    regex: /(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"]{12,}['"]/gi,
  },
];

function scanText(location: string, text: string): void {
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    for (const pattern of patterns) {
      if (pattern.requireKeyword !== undefined && !pattern.requireKeyword.test(line)) {
        continue;
      }
      for (const match of line.matchAll(pattern.regex)) {
        const matched = match[0];
        if (pattern.name === 'gtm-container-id' && matched === GTM_ALLOWLIST) {
          continue;
        }
        finding('no-secrets', `${location}:${lineNumber} ${pattern.name} (${mask(matched)})`);
      }
    }
  });
}

function main(): void {
  const history = process.argv.includes('--history');

  for (const path of git.trackedFiles()) {
    let buffer: Buffer;
    try {
      buffer = readFileSync(path);
    } catch {
      continue;
    }
    if (git.isBinary(buffer)) {
      continue;
    }
    scanText(path, buffer.toString('utf8'));
  }

  for (const range of git.readRangesFromEnv()) {
    for (const entry of git.introducedBlobs(range)) {
      const buffer = git.readBlob(entry.blob);
      if (git.isBinary(buffer)) {
        continue;
      }
      const location = `${entry.blob.slice(0, 7)}:${entry.path}`;
      scanText(location, buffer.toString('utf8'));
    }
  }

  if (history) {
    for (const entry of git.allHistoryBlobs()) {
      const buffer = git.readBlob(entry.blob);
      if (git.isBinary(buffer)) {
        continue;
      }
      const location = `${entry.blob.slice(0, 7)}:${entry.path}`;
      scanText(location, buffer.toString('utf8'));
    }
  }

  finish('no-secrets');
}

main();
