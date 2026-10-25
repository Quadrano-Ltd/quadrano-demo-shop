export type GateName = 'no-secrets' | 'provenance';

let findings = 0;

export function mask(value: string): string {
  const kept = value.slice(0, 4);
  return kept + '*'.repeat(Math.max(0, value.length - kept.length));
}

export function finding(gate: GateName, text: string): void {
  findings++;
  process.stderr.write(`${gate}: ${text}\n`);
}

export function finish(gate: GateName): never {
  process.stderr.write(`${gate}: ${findings} findings\n`);
  process.exit(findings > 0 ? 1 : 0);
}
