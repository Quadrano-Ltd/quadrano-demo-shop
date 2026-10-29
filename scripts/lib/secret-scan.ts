import { mask } from './report.ts';

export const GTM_ALLOWLIST = 'GTM-XXXXXXX';

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
        if (pattern.name === 'gtm-container-id' && matched === GTM_ALLOWLIST) {
          continue;
        }
        findings.push(`${location}:${lineNumber} ${pattern.name} (${mask(matched)})`);
      }
    }
  });
  return findings;
}
