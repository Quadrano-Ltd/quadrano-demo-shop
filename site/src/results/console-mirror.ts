/**
 * Results view capture (FR-003, FR-005, FR-007, FR-008, FR-011).
 *
 * Self-contained and ES5-safe: the quadrano-gtm Vite plugin inlines this
 * file first in <head>, before the offline boot step and the GTM loader.
 * No import, no export, no closing script tag.
 */
/* eslint-disable no-var, prefer-rest-params -- ES5-safe by contract (contracts/console-capture.md) */
(function (): void {
  type MirrorResultGroup = {
    kind: 'group';
    header: string;
    lines: string[];
    pushed: string | null;
  };
  type MirrorPlainLine = { kind: 'line'; text: string };
  type MirrorEntry = MirrorResultGroup | MirrorPlainLine;
  type MirrorResultsState = {
    bannerSeen: boolean;
    entries: MirrorEntry[];
    storage: 'ok' | 'unavailable';
    listen: (fn: () => void) => void;
  };
  type MirrorMethod = { apply(thisArg: Console, args: IArguments): unknown };

  var KEY = 'demo-shop:results-view';
  var stored: string | null = null;
  var storageOk = true;
  try {
    stored = window.sessionStorage.getItem(KEY);
  } catch (e) {
    void e;
    storageOk = false;
  }
  var byLink = /[?&]results=on(?:&|$)/.test(window.location.search);
  if (stored !== 'on' && !byLink) {
    return;
  }

  if (byLink && storageOk && stored !== 'on') {
    try {
      window.sessionStorage.setItem(KEY, 'on');
    } catch (e) {
      void e;
      storageOk = false;
    }
  }

  var root = document.documentElement;
  root.setAttribute('data-results-view', 'on');
  if (!storageOk) {
    root.setAttribute('data-results-storage', 'unavailable');
  }

  // Product and format names; none is a verdict (FR-014).
  var BRAND = '%cQuadrano%c · ';
  var BANNER_MARK = 'Console format v1';
  var GROUP_SHAPE = /^%c[\s\S]%c %s$/;

  var allEntries: MirrorEntry[] = [];
  var open: MirrorResultGroup | null = null;
  var foreignDepth = 0;
  var listener: (() => void) | null = null;

  function notify(): void {
    if (listener !== null) {
      try {
        listener();
      } catch (e) {
        void e;
        // A listener error must never reach the Console wrapper.
      }
    }
  }

  function addEntry(entry: MirrorEntry): void {
    allEntries.push(entry);
    if (allEntries.length > 50) {
      allEntries.shift();
    }
    notify();
  }

  function registerListener(fn: () => void): void {
    listener = fn;
    if (results.bannerSeen || allEntries.length > 0) {
      notify();
    }
  }

  var results: MirrorResultsState = {
    bannerSeen: false,
    entries: allEntries,
    storage: storageOk ? 'ok' : 'unavailable',
    listen: registerListener,
  };
  window.__demoShopResults = results;

  function textOf(args: IArguments): string {
    var index = 1;
    var format: unknown = args[0];
    return String(format).replace(/%[cs]/g, function (token: string): string {
      var value: unknown = args[index];
      index += 1;
      return token === '%c' ? '' : String(value);
    });
  }

  function pushedText(value: unknown): string {
    var text: unknown;
    try {
      text = JSON.stringify(value, null, 2);
    } catch (e) {
      void e;
      text = undefined;
    }
    if (typeof text === 'string') {
      return text;
    }
    return String(value);
  }

  function copyInfoWarn(args: IArguments): void {
    var first: unknown = args[0];
    if (typeof first !== 'string') {
      return;
    }
    if (first.indexOf(BRAND) !== 0) {
      return;
    }
    if (first.indexOf(BANNER_MARK) !== -1) {
      if (!results.bannerSeen) {
        results.bannerSeen = true;
        notify();
      }
      return;
    }
    if (open === null) {
      addEntry({ kind: 'line', text: textOf(args) });
    }
  }

  function copyGroupCollapsed(args: IArguments): void {
    if (open !== null) {
      foreignDepth += 1;
      return;
    }
    var first: unknown = args[0];
    if (args.length === 4 && typeof first === 'string' && GROUP_SHAPE.test(first)) {
      open = { kind: 'group', header: textOf(args), lines: [], pushed: null };
    }
  }

  function copyGroup(): void {
    if (open !== null) {
      foreignDepth += 1;
    }
  }

  function copyGroupEnd(): void {
    if (foreignDepth > 0) {
      foreignDepth -= 1;
      return;
    }
    if (open !== null) {
      addEntry(open);
      open = null;
    }
  }

  function copyLog(args: IArguments): void {
    if (open === null || foreignDepth !== 0) {
      return;
    }
    var first: unknown = args[0];
    if (typeof first !== 'string') {
      return;
    }
    if (args.length === 1) {
      open.lines.push(first);
      return;
    }
    if (args.length === 2) {
      var second: unknown = args[1];
      if (second !== null && typeof second === 'object') {
        open.pushed = first + ' ' + pushedText(second);
      }
    }
  }

  function wrap(
    name: 'groupCollapsed' | 'group' | 'groupEnd' | 'log' | 'info' | 'warn',
    copy: (args: IArguments) => void,
  ): void {
    // eslint-disable-next-line @typescript-eslint/unbound-method -- the method is always called with console as this
    var method = console[name];
    if (typeof method !== 'function') {
      return;
    }
    var original = method as unknown as MirrorMethod;
    console[name] = function (): unknown {
      var result = original.apply(console, arguments);
      try {
        copy(arguments);
      } catch (e) {
        void e;
        // The copy step must never reach the caller.
      }
      return result;
    };
  }

  wrap('groupCollapsed', copyGroupCollapsed);
  wrap('group', copyGroup);
  wrap('groupEnd', copyGroupEnd);
  wrap('log', copyLog);
  wrap('info', copyInfoWarn);
  wrap('warn', copyInfoWarn);
})();
