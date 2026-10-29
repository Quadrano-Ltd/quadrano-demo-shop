import { isContainerId } from '../container/active-container.ts';
import { clear, probe, save } from '../container/visitor-storage.ts';
import {
  readContainerState,
  RESET_UNAVAILABLE_COPY,
  type ContainerState,
} from './banner.ts';
import { mountPlayground } from './playground.ts';

/**
 * The floating "Demo menu" disclosure (FR-005, FR-020): a fixed, labelled
 * toggle opens a non-modal panel with path 1, path 2 and the event playground.
 * Mounted once per page by `renderLayout`; a second call does nothing.
 */

const REFUSAL_PREFIX =
  "That doesn't look like a container ID. Enter it exactly as GTM shows it, for example GTM-XXXXXXX: ";
const REFUSAL_CODE = 'GTM-';
const REFUSAL_SUFFIX = ' and then 4 to 10 capital letters or digits.';

const STORAGE_UNAVAILABLE_COPY =
  "Bringing your own container isn't available in this browser, because it blocks site storage. You can still use the pre-built container and the event playground.";

const PATH_1_SHOP_COPY = "You're using the shop's pre-built container.";
const PATH_1_HINT = 'Open the browser Console to see the output.';

// docs/spike/preview-spike.md run 2 assumes an unpublished container still runs
// in Preview. If that changes, WP11 swaps only this string.
const PREVIEW_STEP = "Start Preview on this shop. You don't need to publish.";

const INSTRUCTION_STEPS: readonly string[] = [
  'Create an empty container in your own GTM account.',
  'Enter its ID here and save.',
  'On quadrano.com/local, build a Specification and copy its snippet.',
  'In your container, add a Custom HTML tag with the snippet, triggered on All Pages.',
  PREVIEW_STEP,
  'Open the browser Console and use the event playground.',
];

function statusCopy(state: ContainerState): string {
  switch (state.source) {
    case 'visitor':
      return `In use: your container ${state.visitorId ?? ''}`;
    case 'shop':
      return "In use: the shop's pre-built container";
    case 'none':
      return 'In use: no container on this build';
  }
}

/** Writes the refusal copy (FR-007) with the `GTM-` fragment in a code element. */
function showRefusal(target: HTMLElement): void {
  target.replaceChildren();
  target.append(REFUSAL_PREFIX);
  const code = document.createElement('code');
  code.textContent = REFUSAL_CODE;
  target.append(code, REFUSAL_SUFFIX);
}

export function mountVisitorMenu(announce: (message: string) => void): void {
  if (document.getElementById('visitor-menu') !== null) {
    return;
  }

  const state = readContainerState();

  const host = document.createElement('aside');
  host.className = 'visitor-menu-host';
  host.setAttribute('aria-label', 'Demo menu');

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'visitor-menu__toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'visitor-menu');
  toggle.textContent = 'Demo menu';

  const panel = document.createElement('section');
  panel.id = 'visitor-menu';
  panel.className = 'visitor-menu';
  panel.hidden = true;
  panel.setAttribute('aria-labelledby', 'visitor-menu-title');

  const title = document.createElement('h2');
  title.id = 'visitor-menu-title';
  title.className = 'visitor-menu__title';
  title.tabIndex = -1;
  title.textContent = 'Demo menu';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'visitor-menu__close';
  close.textContent = 'Close';

  const status = document.createElement('p');
  status.className = 'visitor-menu__status';
  status.textContent = statusCopy(state);

  // Path 1: use the shop's pre-built container (FR-010, User Story 2).
  const path1 = document.createElement('section');
  path1.className = 'visitor-menu__group';
  const path1Heading = document.createElement('h3');
  path1Heading.textContent = 'Show me the output with the pre-built container';
  const path1Button = document.createElement('button');
  path1Button.type = 'button';
  path1Button.className = 'visitor-menu__path';
  path1Button.textContent = 'Show me the output with the pre-built container';
  const path1Message = document.createElement('p');
  path1Message.className = 'visitor-menu__message';
  path1Message.setAttribute('role', 'status');
  const path1Hint = document.createElement('p');
  path1Hint.className = 'visitor-menu__hint';
  path1Hint.textContent = PATH_1_HINT;
  path1.append(path1Heading, path1Button, path1Message, path1Hint);

  // Path 2: bring your own GTM container (FR-006, FR-007, FR-012, FR-024).
  const path2 = document.createElement('section');
  path2.className = 'visitor-menu__group';
  const path2Heading = document.createElement('h3');
  path2Heading.textContent = 'Let me bring my own GTM container';

  const form = document.createElement('form');
  form.className = 'visitor-menu__form';
  form.noValidate = true;

  const label = document.createElement('label');
  label.htmlFor = 'visitor-container-id';
  label.textContent = 'Your container ID';

  const input = document.createElement('input');
  input.id = 'visitor-container-id';
  input.name = 'container-id';
  input.type = 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('autocapitalize', 'characters');
  input.setAttribute('aria-describedby', 'visitor-container-message');

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'visitor-menu__save';
  submit.textContent = 'Save';

  const message = document.createElement('p');
  message.id = 'visitor-container-message';
  message.className = 'visitor-menu__message';
  message.setAttribute('aria-live', 'polite');

  const storageNote = document.createElement('p');
  storageNote.className = 'visitor-menu__note';

  const instructions = document.createElement('ol');
  instructions.className = 'visitor-menu__instructions';
  for (const step of INSTRUCTION_STEPS) {
    const item = document.createElement('li');
    item.textContent = step;
    instructions.append(item);
  }

  form.append(label, input, submit, message, storageNote, instructions);
  path2.append(path2Heading, form);

  // Event playground (FR-014, WP05).
  const playground = document.createElement('section');
  playground.className = 'visitor-menu__group visitor-menu__playground';
  const playgroundHeading = document.createElement('h3');
  playgroundHeading.textContent = 'Event playground';
  playground.append(playgroundHeading);
  mountPlayground(playground, announce);

  panel.append(title, close, status, path1, path2, playground);
  host.append(toggle, panel);

  let storageChecked = false;

  function applyStorageUnavailable(): void {
    input.disabled = true;
    submit.disabled = true;
    storageNote.textContent = STORAGE_UNAVAILABLE_COPY;
  }

  // Probe only on first open, never at page load (avoids a storage write on
  // every page). The head loader's `data-storage="unavailable"` flag is used
  // up front when present.
  function checkStorageOnce(): void {
    if (storageChecked) {
      return;
    }
    storageChecked = true;
    if (state.storageUnavailable || !probe()) {
      applyStorageUnavailable();
    }
  }

  const open = (): void => {
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    checkStorageOnce();
    title.focus();
  };

  const closePanel = (): void => {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  };

  if (state.storageUnavailable) {
    applyStorageUnavailable();
  }

  toggle.addEventListener('click', () => {
    if (panel.hidden) {
      open();
    } else {
      closePanel();
    }
  });

  close.addEventListener('click', closePanel);

  host.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      closePanel();
    }
  });

  // Path 1: switching to the pre-built container (FR-010).
  path1Button.addEventListener('click', () => {
    if (state.source === 'visitor') {
      if (clear() === 'cleared') {
        window.location.reload();
        return;
      }
      path1Message.textContent = RESET_UNAVAILABLE_COPY;
      return;
    }
    path1Message.textContent = PATH_1_SHOP_COPY;
  });

  // Visitor state: a note above the form plus a menu reset (FR-010).
  if (state.source === 'visitor' && state.visitorId !== null) {
    const inUse = document.createElement('p');
    inUse.className = 'visitor-menu__in-use';
    inUse.textContent = `Your container ${state.visitorId} is in use.`;

    const menuReset = document.createElement('button');
    menuReset.type = 'button';
    menuReset.className = 'visitor-menu__reset';
    menuReset.textContent = "Reset to the shop's container";
    menuReset.addEventListener('click', () => {
      if (clear() === 'cleared') {
        window.location.reload();
        return;
      }
      message.textContent = RESET_UNAVAILABLE_COPY;
    });

    const visitorNote = document.createElement('div');
    visitorNote.className = 'visitor-menu__visitor-note';
    visitorNote.append(inUse, menuReset);
    form.before(visitorNote);
  }

  // Path 2 submit (FR-006, FR-007): no trim, no case change.
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value;
    if (!isContainerId(value)) {
      showRefusal(message);
      input.ariaInvalid = 'true';
      input.focus();
      return;
    }
    if (save(value) === 'saved') {
      window.location.reload();
      return;
    }
    applyStorageUnavailable();
  });

  input.addEventListener('input', () => {
    input.ariaInvalid = null;
    message.textContent = '';
  });

  document.body.append(host);
}
