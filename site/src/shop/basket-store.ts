// The session basket (data-model "Basket"). One line per itemId; adding the same
// item again increments its quantity. Money is integer pence only.

import { getProduct } from './catalogue.ts';
import { BASKET_KEY, readJson, remove, writeJson } from './storage.ts';

export interface BasketLine {
  readonly itemId: string;
  readonly quantity: number;
}

function isBasketLine(value: unknown): value is BasketLine {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const line = value as Record<string, unknown>;
  return (
    typeof line.itemId === 'string' &&
    typeof line.quantity === 'number' &&
    Number.isInteger(line.quantity) &&
    line.quantity >= 1
  );
}

function isBasketLineArray(value: unknown): value is BasketLine[] {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every(isBasketLine);
}

function readLines(): BasketLine[] {
  const stored = readJson<BasketLine[]>(BASKET_KEY, isBasketLineArray);
  if (stored === undefined) {
    return [];
  }
  // Lines whose itemId is not in the catalogue are dropped, so a stale session
  // can never contribute an unknown item to a total.
  return stored
    .filter((line) => getProduct(line.itemId) !== undefined)
    .map((line) => ({ itemId: line.itemId, quantity: line.quantity }));
}

function writeLines(lines: readonly BasketLine[]): void {
  writeJson(BASKET_KEY, lines);
}

function toAddedQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) {
    return 1;
  }
  const floored = Math.floor(quantity);
  return floored >= 1 ? floored : 1;
}

export function getLines(): readonly BasketLine[] {
  return readLines();
}

// Returns the line just added (itemId plus the quantity added in this call), so the
// caller can build an add_to_cart push for exactly the added quantity. This module
// never pushes.
export function addItem(itemId: string, quantity = 1): BasketLine {
  const addedQuantity = toAddedQuantity(quantity);
  const lines = readLines();
  const existing = lines.some((line) => line.itemId === itemId);
  if (existing) {
    writeLines(
      lines.map((line) =>
        line.itemId === itemId ? { itemId, quantity: line.quantity + addedQuantity } : line,
      ),
    );
  } else {
    writeLines([...lines, { itemId, quantity: addedQuantity }]);
  }
  return { itemId, quantity: addedQuantity };
}

// Non-integer quantities are floored; a floored quantity below 1 removes the line.
// A non-finite quantity is ignored. Setting a quantity for an item not yet in the
// basket adds a new line.
export function setQuantity(itemId: string, quantity: number): void {
  if (!Number.isFinite(quantity)) {
    return;
  }
  const floored = Math.floor(quantity);
  const lines = readLines();
  if (floored < 1) {
    writeLines(lines.filter((line) => line.itemId !== itemId));
    return;
  }
  const existing = lines.some((line) => line.itemId === itemId);
  if (existing) {
    writeLines(
      lines.map((line) => (line.itemId === itemId ? { itemId, quantity: floored } : line)),
    );
  } else {
    writeLines([...lines, { itemId, quantity: floored }]);
  }
}

export function removeItem(itemId: string): void {
  writeLines(readLines().filter((line) => line.itemId !== itemId));
}

export function clear(): void {
  remove(BASKET_KEY);
}

// Used by "Order again": replaces the basket with the given lines, keeping only the
// ones that still reference a catalogue item.
export function restore(lines: readonly BasketLine[]): void {
  writeLines(
    lines
      .filter((line) => getProduct(line.itemId) !== undefined)
      .map((line) => ({ itemId: line.itemId, quantity: line.quantity })),
  );
}

export function itemCount(): number {
  return getLines().reduce((sum, line) => sum + line.quantity, 0);
}

export function totalPence(): number {
  return getLines().reduce((sum, line) => {
    const product = getProduct(line.itemId);
    return product === undefined ? sum : sum + product.pricePence * line.quantity;
  }, 0);
}

export function isEmpty(): boolean {
  return getLines().length === 0;
}
