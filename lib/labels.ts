import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';

/** Standard Code 39 patterns: 9 elements (bar, space, bar, …), N = narrow, W = wide. */
export const CODE39: Record<string, string> = {
  '0': 'NNNWWNWNN', '1': 'WNNWNNNNW', '2': 'NNWWNNNNW', '3': 'WNWWNNNNN',
  '4': 'NNNWWNNNW', '5': 'WNNWWNNNN', '6': 'NNWWWNNNN', '7': 'NNNWNNWNW',
  '8': 'WNNWNNWNN', '9': 'NNWWNNWNN', 'A': 'WNNNNWNNW', 'B': 'NNWNNWNNW',
  'C': 'WNWNNWNNN', 'D': 'NNNNWWNNW', 'E': 'WNNNWWNNN', 'F': 'NNWNWWNNN',
  'G': 'NNNNNWWNW', 'H': 'WNNNNWWNN', 'I': 'NNWNNWWNN', 'J': 'NNNNWWWNN',
  'K': 'WNNNNNNWW', 'L': 'NNWNNNNWW', 'M': 'WNWNNNNWN', 'N': 'NNNNWNNWW',
  'O': 'WNNNWNNWN', 'P': 'NNWNWNNWN', 'Q': 'NNNNNNWWW', 'R': 'WNNNNNWWN',
  'S': 'NNWNNNWWN', 'T': 'NNNNWNWWN', 'U': 'WWNNNNNNW', 'V': 'NWWNNNNNW',
  'W': 'WWWNNNNNN', 'X': 'NWNNWNNNW', 'Y': 'WWNNWNNNN', 'Z': 'NWWNWNNNN',
  '-': 'NWNNNNWNW', '.': 'WWNNNNNWN', ' ': 'NWWNNNWNN', '*': 'NWNNWNWNN',
  '$': 'NWNWNWNNN', '/': 'NWNWNNNWN', '+': 'NWNNNWNWN', '%': 'NNNWNWNWN',
};

/** Wide elements are 3× the narrow ones, the most forgiving Code 39 ratio for scanners and cameras. */
export const WIDE_RATIO = 3;
/** Blank space each side of the bars, in narrow widths (Code 39 needs at least 10). */
const QUIET_ZONE = 10;

/**
 * The bars for a Code 39 value, in narrow-bar units, including the quiet zones and the * start/stop
 * characters. `width` is the total size; each bar has an `x` and a `width`.
 */
export function code39Bars(value: string) {
  const bars: { x: number; width: number }[] = [];
  let x = QUIET_ZONE;
  for (const ch of `*${value}*`) {
    const pattern = CODE39[ch] ?? CODE39['-'];
    for (let i = 0; i < 9; i++) {
      const w = pattern[i] === 'W' ? WIDE_RATIO : 1;
      if (i % 2 === 0) bars.push({ x, width: w });
      x += w;
    }
    x += 1; // gap between characters
  }
  return { bars, width: x - 1 + QUIET_ZONE };
}

/** Sticker roll sizes the labels can be printed on, in millimetres. */
export const LABEL_SIZES = [
  { id: '50x25', name: '50 × 25 mm', width: 50, height: 25 },
  { id: '60x30', name: '60 × 30 mm', width: 60, height: 30 },
  { id: '75x35', name: '75 × 35 mm', width: 75, height: 35 },
] as const;
export type LabelSize = (typeof LABEL_SIZES)[number];

export const LABEL_BRAND = 'SWAADHA KITCHEN';

/**
 * Where everything sits on a label, as shares of its height (`top`, `size`) or width (`side`). Both
 * the on-screen preview and the PDF use these, so what you see is what prints.
 */
export const LABEL_LAYOUT = {
  side: 0.05,
  brand: { top: 0.055, size: 0.095 },
  name: { top: 0.16, size: 0.085 },
  bars: { top: 0.29, bottom: 0.61 },
  code: { top: 0.635, size: 0.085 },
  rule: 0.775,
  foot: { top: 0.83, size: 0.1 },
  barsMaxWidth: 0.9,
};

export type LabelProduct = { name: string; weight: string; price: number; code: string };

/** Text that Helvetica/Courier in a PDF can draw; anything else (other scripts, emoji) is dropped. */
const pdfSafe = (text: string) =>
  text.replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7E\xA0-\xFF…]/g, '').trim();

export const labelPrice = (price: number) => price.toLocaleString('en-IN', { maximumFractionDigits: 2 });
export const labelWeight = (weight: string) => (weight.trim() ? `NET WT: ${weight.trim().toUpperCase()}` : '');

const MM = 72 / 25.4;
const ink = rgb(0.07, 0.07, 0.07);
const grey = rgb(0.22, 0.22, 0.22);
/** Capital letters are about this share of the font size tall in Helvetica and Courier. */
const CAP = 0.72;

/** ₹ as strokes in a box 1 unit tall, since the PDF's built-in fonts can't type it. */
const RUPEE_PATH = 'M0 0 H0.62 M0 0.27 H0.62 M0.06 0 H0.22 C0.46 0 0.53 0.14 0.53 0.29 C0.53 0.46 0.38 0.56 0.18 0.56 H0.06 M0.15 0.56 L0.56 1';
const RUPEE_WIDTH = 0.68;

/**
 * A PDF with `count` copies of the product's label, one per page, each page exactly the sticker size,
 * so label printers print one sticker per page and nothing needs cutting.
 */
export async function labelPdf(product: LabelProduct, size: LabelSize, count: number) {
  const doc = await PDFDocument.create();
  doc.setTitle(`Labels - ${pdfSafe(product.name)}`);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const copies = Math.max(1, Math.min(1000, Math.floor(count)));
  for (let i = 0; i < copies; i++) drawLabel(doc.addPage([size.width * MM, size.height * MM]), product, bold, mono);
  return doc.save();
}

function drawLabel(page: PDFPage, product: LabelProduct, bold: PDFFont, mono: PDFFont) {
  const { width: W, height: H } = page.getSize();
  const L = LABEL_LAYOUT;
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1) });
  const side = W * L.side;
  const room = W - side * 2;
  // `top` is where the top of the capital letters goes, measured down from the top edge.
  const baseline = (top: number, size: number) => H - top * H - size * CAP;

  function centred(text: string, top: number, share: number, font: PDFFont, letterSpacing = 0) {
    const [fitted, size] = fit(text, font, share * H, room);
    const width = font.widthOfTextAtSize(fitted, size) + letterSpacing * size * (fitted.length - 1);
    let x = (W - width) / 2;
    if (!letterSpacing) return page.drawText(fitted, { x, y: baseline(top, size), size, font, color: ink });
    for (const ch of fitted) {
      page.drawText(ch, { x, y: baseline(top, size), size, font, color: ink });
      x += font.widthOfTextAtSize(ch, size) + letterSpacing * size;
    }
  }

  centred(LABEL_BRAND, L.brand.top, L.brand.size, bold);
  centred(pdfSafe(product.name).toUpperCase(), L.name.top, L.name.size, bold);

  const { bars, width: units } = code39Bars(product.code);
  const barsHeight = (L.bars.bottom - L.bars.top) * H;
  const unit = Math.min((W * L.barsMaxWidth) / units, 0.35 * MM);
  const barsLeft = (W - units * unit) / 2;
  for (const bar of bars)
    page.drawRectangle({ x: barsLeft + bar.x * unit, y: H - L.bars.bottom * H, width: bar.width * unit, height: barsHeight, color: ink });

  centred(product.code, L.code.top, L.code.size, mono, 0.25);

  page.drawLine({
    start: { x: side, y: H - L.rule * H },
    end: { x: W - side, y: H - L.rule * H },
    thickness: 0.5,
    color: grey,
    dashArray: [1.6, 1.2],
  });

  // Footer: net weight on the left, MRP on the right, sized together so they never overlap.
  const weight = pdfSafe(labelWeight(product.weight));
  const mrp = 'MRP: ';
  const amount = labelPrice(product.price);
  let size = L.foot.size * H;
  const footWidth = (s: number) =>
    bold.widthOfTextAtSize(weight, s * 0.85) + s * 0.6 + bold.widthOfTextAtSize(mrp + amount, s) + s * CAP * RUPEE_WIDTH;
  while (size > 3 && footWidth(size) > room) size -= 0.25;
  const y = baseline(L.foot.top, size);
  if (weight) page.drawText(weight, { x: side, y, size: size * 0.85, font: bold, color: grey });
  let x = W - side - bold.widthOfTextAtSize(mrp + amount, size) - size * CAP * RUPEE_WIDTH;
  page.drawText(mrp, { x, y, size, font: bold, color: ink });
  x += bold.widthOfTextAtSize(mrp, size);
  const glyph = size * CAP;
  page.drawSvgPath(RUPEE_PATH, { x, y: y + glyph, scale: glyph, borderColor: ink, borderWidth: 0.12, borderLineCap: 1 });
  page.drawText(amount, { x: x + glyph * RUPEE_WIDTH, y, size, font: bold, color: ink });
}

/** Shrinks text to fit the width (down to 70% of its size), then shortens it with an ellipsis. */
function fit(text: string, font: PDFFont, size: number, room: number): [string, number] {
  let s = size;
  while (s > size * 0.7 && font.widthOfTextAtSize(text, s) > room) s -= 0.25;
  if (font.widthOfTextAtSize(text, s) <= room) return [text, s];
  let cut = text;
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}…`, s) > room) cut = cut.slice(0, -1).trimEnd();
  return [`${cut}…`, s];
}
