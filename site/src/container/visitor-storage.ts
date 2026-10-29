/**
 * The only module that writes the saved visitor container ID (R-04).
 *
 * Unlike the basket's `site/src/shop/storage.ts`, this wrapper has no
 * in-memory fallback: a memory-only save would look as if it worked, and the
 * next page would load the shop's container. Every access is guarded, because
 * in some locked-down browsers even reading `window.localStorage` throws.
 */

import {
  VISITOR_CONTAINER_KEY,
  isContainerId,
  serialiseSavedContainer,
} from './active-container.ts';

const PROBE_KEY = 'demo-shop:storage-probe';

/** Write, read back and remove a probe key. False on any throw or mismatch. */
export function probe(): boolean {
  try {
    const storage = window.localStorage;
    const token = 'ok';
    storage.setItem(PROBE_KEY, token);
    const match = storage.getItem(PROBE_KEY) === token;
    storage.removeItem(PROBE_KEY);
    return match;
  } catch {
    return false;
  }
}

/** Save a container ID with the current time. Caller has checked isContainerId(id). */
export function save(id: string): 'saved' | 'unavailable' {
  if (!isContainerId(id)) {
    throw new Error('save expects a container ID');
  }
  try {
    const storage = window.localStorage;
    const value = serialiseSavedContainer(id, Date.now());
    storage.setItem(VISITOR_CONTAINER_KEY, value);
    return storage.getItem(VISITOR_CONTAINER_KEY) === value ? 'saved' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/** Remove the saved ID. */
export function clear(): 'cleared' | 'unavailable' {
  try {
    const storage = window.localStorage;
    storage.removeItem(VISITOR_CONTAINER_KEY);
    return storage.getItem(VISITOR_CONTAINER_KEY) === null ? 'cleared' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}
