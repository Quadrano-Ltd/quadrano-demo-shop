// Safe sessionStorage wrapper (R-07). Every read and write is guarded so a blocked,
// unavailable or throwing storage never breaks the shop. Values are mirrored to a
// module-level in-memory map, so a tab whose storage starts throwing mid-session
// keeps working for the rest of the tab.

export const BASKET_KEY = 'demo-shop:basket';
export const ORDER_KEY = 'demo-shop:order';

const memory = new Map<string, string>();

function getStorage(): Storage | undefined {
  try {
    const storage: unknown = globalThis.sessionStorage;
    if (typeof storage === 'object' && storage !== null) {
      return storage as Storage;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function readRaw(key: string): string | undefined {
  const storage = getStorage();
  if (storage !== undefined) {
    try {
      const value = storage.getItem(key);
      if (value !== null) {
        memory.set(key, value);
        return value;
      }
    } catch {
      // Fall back to the memory map below.
    }
  }
  return memory.get(key);
}

export function readJson<T>(key: string, guard: (value: unknown) => value is T): T | undefined {
  const raw = readRaw(key);
  if (raw === undefined) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
  return guard(parsed) ? parsed : undefined;
}

export function writeJson(key: string, value: unknown): void {
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  const storage = getStorage();
  if (storage !== undefined) {
    try {
      storage.setItem(key, raw);
    } catch {
      // The memory map already holds the value.
    }
  }
}

export function remove(key: string): void {
  memory.delete(key);
  const storage = getStorage();
  if (storage !== undefined) {
    try {
      storage.removeItem(key);
    } catch {
      // The memory map is already clear.
    }
  }
}
