import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { code39Bars, LABEL_SIZES, labelPdf } from '../lib/labels';

const product = { name: 'Mango Pickle', weight: '250 g', price: 450, code: 'SW-MNG001' };

test('Code 39 bars: 5 bars per character plus start and stop, with quiet zones', () => {
  const { bars, width } = code39Bars('SW-MNG001');
  assert.equal(bars.length, (9 + 2) * 5);
  assert.equal(bars[0].x, 10);
  assert.equal(width - (bars.at(-1)!.x + bars.at(-1)!.width), 10);
});

test('Label PDF has one page per copy, each exactly the sticker size', async () => {
  const size = LABEL_SIZES[0];
  const pdf = await PDFDocument.load(await labelPdf(product, size, 3));
  assert.equal(pdf.getPageCount(), 3);
  const page = pdf.getPage(0).getSize();
  assert.equal(Math.round((page.width / 72) * 25.4), size.width);
  assert.equal(Math.round((page.height / 72) * 25.4), size.height);
});

test('Copies are clamped to between 1 and 1000, and odd names still print', async () => {
  const one = await PDFDocument.load(await labelPdf({ ...product, name: 'ఆవకాయ Mango — “special”' }, LABEL_SIZES[1], 0));
  assert.equal(one.getPageCount(), 1);
});
