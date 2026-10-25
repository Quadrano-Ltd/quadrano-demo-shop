/**
 * Correct data layer push objects (FR-004, FR-005).
 *
 * "Attribute" here means a key inside a pushed event object (Terminology Canon).
 * Every Attribute name and the transaction-id pattern live in this one file so
 * that the W2 freeze reconciliation (FR-024) is a few-line diff.
 */

export interface PushLine {
  readonly itemId: string;
  readonly name: string;
  readonly pricePence: number;
  readonly quantity: number;
}

export const CURRENCY = 'GBP';

// Working pattern until the W2 freeze (FR-024). Change here only.
export const TRANSACTION_ID_PATTERN = /^T-[0-9]{6}$/;

export interface PushItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
}

export interface AddToCartPush {
  event: 'add_to_cart';
  ecommerce: { currency: string; value: number; items: PushItem[] };
}

export interface PurchasePush {
  event: 'purchase';
  ecommerce: {
    transaction_id: string;
    currency: string;
    value: number;
    items: PushItem[];
  };
}

/**
 * Integer pence → a number with at most two decimal places (pence / 100).
 * Throws on non-integer input (a programming error, not a data error).
 */
export function toAmount(pence: number): number {
  if (!Number.isInteger(pence)) {
    throw new Error(`toAmount expects integer pence, got ${String(pence)}`);
  }
  return pence / 100;
}

/** 'T-' followed by six digits from crypto.getRandomValues, zero-padded. */
export function newTransactionId(): string {
  const values = globalThis.crypto.getRandomValues(new Uint32Array(1));
  const value = (values[0] ?? 0) % 1_000_000;
  return `T-${String(value).padStart(6, '0')}`;
}

export function buildAddToCart(line: PushLine): AddToCartPush {
  return {
    event: 'add_to_cart',
    ecommerce: {
      currency: CURRENCY,
      value: toAmount(line.pricePence * line.quantity),
      items: [
        {
          item_id: line.itemId,
          item_name: line.name,
          price: toAmount(line.pricePence),
          quantity: line.quantity,
        },
      ],
    },
  };
}

export function buildPurchase(input: {
  transactionId: string;
  lines: readonly PushLine[];
}): PurchasePush {
  const totalPence = input.lines.reduce(
    (sum, line) => sum + line.pricePence * line.quantity,
    0,
  );
  return {
    event: 'purchase',
    ecommerce: {
      transaction_id: input.transactionId,
      currency: CURRENCY,
      value: toAmount(totalPence),
      items: input.lines.map((line) => ({
        item_id: line.itemId,
        item_name: line.name,
        price: toAmount(line.pricePence),
        quantity: line.quantity,
      })),
    },
  };
}
