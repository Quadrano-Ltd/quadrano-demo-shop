// The Order record and its lifecycle (data-model.md): Placed -> Pushed, plus
// "Order again". This module stores the order; the caller builds and sends the
// purchase push. Money is integer pence only.

import { getProduct } from './catalogue.ts';
import { clear, getLines, restore } from './basket-store.ts';
import { ORDER_KEY, readJson, writeJson } from './storage.ts';

export interface OrderLine {
  readonly itemId: string;
  readonly name: string;
  readonly pricePence: number;
  readonly quantity: number;
}

export interface Order {
  readonly transactionId: string;
  readonly lines: readonly OrderLine[];
  readonly totalPence: number;
  readonly scenario: string;
  readonly pushed: boolean;
}

function isOrderLine(value: unknown): value is OrderLine {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const line = value as Record<string, unknown>;
  return (
    typeof line.itemId === 'string' &&
    typeof line.name === 'string' &&
    typeof line.pricePence === 'number' &&
    Number.isInteger(line.pricePence) &&
    line.pricePence > 0 &&
    typeof line.quantity === 'number' &&
    Number.isInteger(line.quantity) &&
    line.quantity >= 1
  );
}

function isOrder(value: unknown): value is Order {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const order = value as Record<string, unknown>;
  return (
    typeof order.transactionId === 'string' &&
    Array.isArray(order.lines) &&
    (order.lines as unknown[]).every(isOrderLine) &&
    typeof order.totalPence === 'number' &&
    Number.isInteger(order.totalPence) &&
    order.totalPence >= 0 &&
    typeof order.scenario === 'string' &&
    typeof order.pushed === 'boolean'
  );
}

// An empty basket cannot place an order: nothing changes and undefined is returned.
// A new placeOrder while a previous order is still unpushed overwrites it.
export function placeOrder(input: { transactionId: string; scenario: string }): Order | undefined {
  const lines = getLines();
  if (lines.length === 0) {
    return undefined;
  }
  const orderLines: OrderLine[] = [];
  for (const line of lines) {
    const product = getProduct(line.itemId);
    if (product !== undefined) {
      orderLines.push({
        itemId: product.itemId,
        name: product.name,
        pricePence: product.pricePence,
        quantity: line.quantity,
      });
    }
  }
  const total = orderLines.reduce((sum, line) => sum + line.pricePence * line.quantity, 0);
  const order: Order = {
    transactionId: input.transactionId,
    lines: orderLines,
    totalPence: total,
    scenario: input.scenario,
    pushed: false,
  };
  writeJson(ORDER_KEY, order);
  clear();
  return order;
}

export function getOrder(): Order | undefined {
  return readJson<Order>(ORDER_KEY, isOrder);
}

// This is the ONLY place that flips `pushed` to true (FR-016). The stored order is
// marked before returning, so even if the caller throws after the push, a reload can
// never double-push: the worst case is a missed push, never a doubled one.
export function takeUnpushedOrder(): Order | undefined {
  const order = getOrder();
  if (order === undefined || order.pushed) {
    return undefined;
  }
  writeJson(ORDER_KEY, { ...order, pushed: true });
  return order;
}

// Restores the last order's lines to the basket, no push. The order is kept; the
// next placeOrder overwrites it.
export function orderAgain(): boolean {
  const order = getOrder();
  if (order === undefined) {
    return false;
  }
  restore(order.lines.map((line) => ({ itemId: line.itemId, quantity: line.quantity })));
  return true;
}
