import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSku, isCurrentSku, isGeneratedSku, skuBarcode } from '../lib/products';

test('SKU uses SW-, 3 letters from the name and the next running number', () => {
  assert.equal(generateSku('Mango Pickle'), 'SW-MNG001');
  assert.equal(generateSku('Mango Pudding', ['SW-MNG001']), 'SW-MNG002');
  assert.equal(generateSku('Lemon Pickle', ['SW-MNG001', 'SW-MANGO-007', 'SW-TEA-004', 'OLD-12']), 'SW-LMN008');
  assert.equal(generateSku('Tea', ['sw-mng002']), 'SW-TEA003');
  assert.equal(generateSku('5 spice mix'), 'SW-SPC001');
  assert.equal(generateSku('Ai'), 'SW-AIX001');
  assert.equal(generateSku('  '), '');
  assert.equal(generateSku('ఆవకాయ'), 'SW-ITM001');
});

test('Barcode comes from the SKU and stays short enough for a label', () => {
  assert.equal(skuBarcode('SW-MNG001'), 'SW-MNG001');
  assert.equal(skuBarcode('sw-mng1000'), 'SW-MNG1000');
  assert.equal(skuBarcode('SW-MANGO-PICKLE'), 'SWMANGOPICKLE');
});

test('Recognises generated SKUs', () => {
  assert.ok(isGeneratedSku('SW-MNG001'));
  assert.ok(isGeneratedSku('SW-MNG-001'));
  assert.ok(isGeneratedSku('SW-MANGO-001'));
  assert.ok(!isGeneratedSku('MANGO-250'));
});

test('Only SKUs in the SW-MNG001 form count as up to date', () => {
  assert.ok(isCurrentSku('SW-MNG001'));
  assert.ok(isCurrentSku('SW-MNG1000'));
  assert.ok(!isCurrentSku('SW-MNG-001'));
  assert.ok(!isCurrentSku('SW-MANGO-001'));
  assert.ok(!isCurrentSku('MANGO-250'));
  assert.ok(!isCurrentSku(''));
});
