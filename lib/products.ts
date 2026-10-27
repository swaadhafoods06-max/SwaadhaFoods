export type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  weight: string;
  image: string;
  available: boolean;
  stock?: number;
  sku?: string;
  barcode?: string;
  long_description?: string;
  ingredients?: string;
  allergens?: string;
  shelf_life?: string;
  storage?: string;
  net_weight_grams?: number;
};

/** Longest code that still scans reliably on a 60 mm label from a 203-dpi thermal printer. */
export const MAX_LABEL_CODE_LENGTH = 12;

/** SKUs made by `generateSku`, e.g. SW-MNG007. Older ones (SW-MNG-001, SW-MANGO-001) share the same running number. */
const autoSku = /^SW-(?:[A-Z]{3}|[A-Z0-9]{1,5}-)(\d+)$/;

/** 3 letters for a SKU: the first letter, then the next consonants, then vowels if there aren't enough. Mango → MNG. */
function skuLetters(name: string) {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, '');
  if (!letters) return 'ITM';
  const rest = [...letters.slice(1)];
  const picked = letters[0] + rest.filter((c) => !'AEIOU'.includes(c)).join('') + rest.filter((c) => 'AEIOU'.includes(c)).join('');
  return picked.slice(0, 3).padEnd(3, 'X');
}

/**
 * A SKU from the product name: SW-, 3 letters from the name, then the next running number after the
 * highest one already used, shared by every product (SW-MNG001, SW-LMN002, …). Returns '' for an empty name.
 */
export function generateSku(name: string, existingSkus: Iterable<string | undefined> = []): string {
  if (!name.trim()) return '';
  let highest = 0;
  for (const sku of existingSkus) {
    const match = sku?.trim().toUpperCase().match(autoSku);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `SW-${skuLetters(name)}${String(highest + 1).padStart(3, '0')}`;
}

/** True for a SKU in the SW-MNG001 form that `generateSku` makes. */
export const isGeneratedSku = (sku: string) => autoSku.test(sku.trim().toUpperCase());

/** True when a SKU is already in the current SW-MNG001 form, so it doesn't need renumbering. */
export const isCurrentSku = (sku = '') => /^SW-[A-Z]{3}\d{3,}$/.test(sku.trim());

/** The barcode value for a SKU: the SKU itself, without hyphens if it would be too long for a label. */
export function skuBarcode(sku: string): string {
  const code = sku.trim().toUpperCase().replace(/[^0-9A-Z-]/g, '');
  return code.length > MAX_LABEL_CODE_LENGTH ? code.replace(/-/g, '') : code;
}

export const whatsapp = (text: string) => `https://wa.me/918296295658?text=${encodeURIComponent(text)}`;

export function withDetails(p: Product): Product {
  return {
    stock: p.stock ?? 0,
    sku: p.sku ?? '',
    barcode: p.barcode ?? '',
    long_description: p.long_description ?? '',
    ingredients: p.ingredients ?? '',
    allergens: p.allergens ?? '',
    shelf_life: p.shelf_life ?? '',
    storage: p.storage ?? '',
    net_weight_grams: p.net_weight_grams ?? 250,
    ...p,
  };
}
