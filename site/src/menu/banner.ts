import { isContainerId } from '../container/active-container.ts';
import { clear } from '../container/visitor-storage.ts';

/**
 * The visitor banner (FR-009, FR-010): a normal-flow region above the header
 * that shows which container is running and offers a reset. It is mounted once
 * per page by `renderLayout` and only appears when the head loader chose the
 * visitor's container.
 */

export interface ContainerState {
  readonly source: 'visitor' | 'shop' | 'none';
  readonly visitorId: string | null; // only if source is visitor AND isContainerId
  readonly storageUnavailable: boolean;
}

/**
 * Reads the container state the head loader (WP04) wrote onto `<html>`. An
 * unknown `data-container-source` is treated as `none`, and a visitor ID is
 * re-checked with `isContainerId` before it is ever shown (never display an
 * unchecked string).
 */
export function readContainerState(root: HTMLElement = document.documentElement): ContainerState {
  const sourceAttribute = root.getAttribute('data-container-source');
  const source =
    sourceAttribute === 'visitor' || sourceAttribute === 'shop' || sourceAttribute === 'none'
      ? sourceAttribute
      : 'none';

  const storageUnavailable = root.getAttribute('data-storage') === 'unavailable';

  if (source === 'visitor') {
    const raw = root.getAttribute('data-visitor-container');
    if (isContainerId(raw)) {
      return { source, visitorId: raw, storageUnavailable };
    }
    // The attribute failed the ID check: fall back to the shop's container.
    return { source: 'shop', visitorId: null, storageUnavailable };
  }

  return { source, visitorId: null, storageUnavailable };
}

export const RESET_UNAVAILABLE_COPY =
  "This browser wouldn't let the shop remove your container ID. Clear this site's data to reset.";

/**
 * Builds the banner, or `null` unless the visitor's container is in use.
 * The ID is always written with `textContent`, never as HTML markup.
 */
export function createVisitorBanner(state: ContainerState): HTMLElement | null {
  if (state.source !== 'visitor' || state.visitorId === null) {
    return null;
  }

  const banner = document.createElement('div');
  banner.className = 'visitor-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Container');

  const text = document.createElement('p');
  text.className = 'visitor-banner__text';
  text.textContent = `Using your container ${state.visitorId}`;

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'visitor-banner__reset';
  reset.textContent = "Reset to the shop's container";
  reset.addEventListener('click', () => {
    if (clear() === 'cleared') {
      window.location.reload();
      return;
    }
    text.textContent = RESET_UNAVAILABLE_COPY;
    text.tabIndex = -1;
    text.focus();
  });

  banner.append(text, reset);
  return banner;
}
