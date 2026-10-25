// The fictional product range (C-010). Products are plain data, not pushed-event
// Attributes; the itemId and name become the item_id and item_name Attributes when
// the data layer's event modules push them. Money here is integer pence only.

export type ArtId = 'mug' | 'notebook' | 'candle' | 'tote';

export interface Product {
  readonly itemId: string;
  readonly name: string;
  readonly pricePence: number;
  readonly art: ArtId;
  readonly blurb: string;
}

// Fictional shop brand (C-010): a made-up name. It was checked against web results
// for an existing retailer or trademark before settling, and none matched.
export const SHOP_NAME = 'Thimblewick';

export const HERO_PRODUCT_ID = 'SKU-1001';

const HERO_PRODUCT: Product = {
  itemId: HERO_PRODUCT_ID,
  name: 'Stoneware Mug',
  pricePence: 1299,
  art: 'mug',
  blurb: 'A sturdy glazed mug that keeps the morning warm.',
};

// The hero product is listed first (data-model.md). Every pricePence is a positive
// integer, and every itemId is unique.
export const PRODUCTS: readonly Product[] = [
  HERO_PRODUCT,
  {
    itemId: 'SKU-1002',
    name: 'Linen Notebook',
    pricePence: 850,
    art: 'notebook',
    blurb: 'A cloth-bound notebook with pages that lie flat.',
  },
  {
    itemId: 'SKU-1003',
    name: 'Beeswax Candle',
    pricePence: 1575,
    art: 'candle',
    blurb: 'A hand-poured candle with a soft, natural scent.',
  },
  {
    itemId: 'SKU-1004',
    name: 'Canvas Tote',
    pricePence: 2400,
    art: 'tote',
    blurb: 'A roomy cotton tote for everyday carrying.',
  },
];

export function getProduct(id: string | null | undefined): Product | undefined {
  if (id === null || id === undefined) {
    return undefined;
  }
  return PRODUCTS.find((product) => product.itemId === id);
}

export function getProductOrHero(id: string | null | undefined): Product {
  return getProduct(id) ?? HERO_PRODUCT;
}
