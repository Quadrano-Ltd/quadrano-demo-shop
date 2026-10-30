import { mask } from './report.ts';

export const GTM_ALLOWLIST = 'GTM-XXXXXXX';

// Charter 1.1.1 (QDR-004): any all-X container ID is a placeholder, never a
// real container. GTM_ALLOWLIST stays the one to write; this also accepts the
// shorter all-X forms already in this repository's history.
const GTM_PLACEHOLDER = /^GTM-X{4,10}$/;

// Charter 1.1.1 (QDR-004): Spec Kitty records commit SHAs as `"lane_head":
// "<40 hex>"` in its coordination logs. Only that exact shape is skipped; a
// 40-character token anywhere else is still reported.
const LANE_HEAD_PREFIX = '"lane_head": "';
const GIT_SHA = /^[0-9a-f]{40}$/;

export function isGtmPlaceholder(value: string): boolean {
  return GTM_PLACEHOLDER.test(value);
}

function isLaneHeadSha(line: string, matched: string, index: number): boolean {
  return (
    GIT_SHA.test(matched) &&
    line.slice(index - LANE_HEAD_PREFIX.length, index) === LANE_HEAD_PREFIX
  );
}

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

/** Returns one finding text per match, formatted exactly as no-secrets prints it. */
export function scanText(location: string, text: string): string[] {
  const findings: string[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    for (const pattern of patterns) {
      if (pattern.requireKeyword !== undefined && !pattern.requireKeyword.test(line)) {
        continue;
      }
      for (const match of line.matchAll(pattern.regex)) {
        const matched = match[0];
        if (pattern.name === 'gtm-container-id' && isGtmPlaceholder(matched)) {
          continue;
        }
        if (
          pattern.name === 'cloudflare-token-like' &&
          isLaneHeadSha(line, matched, match.index)
        ) {
          continue;
        }
        findings.push(`${location}:${lineNumber} ${pattern.name} (${mask(matched)})`);
      }
    }
  });
  return findings;
}
