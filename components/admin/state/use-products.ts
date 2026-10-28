'use client';
import { FormEvent, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase-admin';
import { generateSku, isCurrentSku, isGeneratedSku, Product, skuBarcode, withDetails } from '@/lib/products';
import { generateBarcodeValue, productBarcode } from '../barcode';
import type { Draft } from '../config';
import type { AdminData } from './use-admin-data';

/** Adding, editing, hiding and deleting products, plus the barcode label popup. */
export function useProducts({ products, run }: AdminData) {
  const [productEdit, setProductEdit] = useState<Draft<Product> | null>(null);
  const [barcodeModalProduct, setBarcodeModalProduct] = useState<Product | null>(null);
  // Stock when the editor opened, so a save can't overwrite a sale made meanwhile.
  const originalStock = useRef<number | null>(null);

  function openProduct(product: Product) {
    originalStock.current = product.stock ?? 0;
    setProductEdit(withDetails(product));
  }

  function saveProduct(e: FormEvent) {
    e.preventDefault();
    if (!productEdit) return;
    run(async () => {
      const { id, ...values } = productEdit;
      if (!Number.isFinite(values.price) || values.price < 0) throw new Error('Enter a valid price.');
      if (!Number.isInteger(values.stock) || Number(values.stock) < 0) throw new Error('Stock must be a whole number of packs, zero or higher.');
      values.sku = values.sku?.trim() ?? '';
      if (values.sku) {
        // Check against the database, not this page's list, which may be out of date.
        const saved = await supabase!.from('products').select('id,sku');
        if (saved.error) throw saved.error;
        const otherSkus = (saved.data ?? []).filter((p) => p.id !== id).map((p) => String(p.sku ?? ''));
        if (otherSkus.some((s) => s.trim().toUpperCase() === values.sku!.toUpperCase())) {
          if (id || !isGeneratedSku(values.sku)) throw new Error(`Another product already uses the SKU ${values.sku}.`);
          // Someone added a product since this form opened, so take the next free number.
          values.sku = generateSku(values.name, otherSkus);
        }
      }
      // The barcode is made from the SKU. An existing one is kept while the SKU is unchanged, so printed labels still scan.
      const original = products.find((p) => p.id === id);
      if (!values.barcode?.trim() || values.sku !== (original?.sku ?? '').trim()) {
        values.barcode = generateBarcodeValue(values.sku, products.filter((p) => p.id !== id).map(productBarcode));
      }
      let r = id
        ? await supabase!.from('products').update(values).eq('id', id).eq('stock', originalStock.current ?? 0).select().single()
        : await supabase!.from('products').insert(values).select().single();
      if (r.error && r.error.message?.includes('barcode')) {
        const { barcode: _b, ...fallbackValues } = values;
        r = id
          ? await supabase!.from('products').update(fallbackValues).eq('id', id).eq('stock', originalStock.current ?? 0).select().single()
          : await supabase!.from('products').insert(fallbackValues).select().single();
      }
      if (r.error) {
        throw new Error(
          r.error.code === 'PGRST116'
            ? 'Stock changed while you were editing. Close and reopen the product to load the latest stock.'
            : r.error.message
        );
      }
      setProductEdit(null);
    }, 'Product saved.');
  }

  function toggleProduct(p: Product) {
    run(async () => {
      const r = await supabase!.from('products').update({ available: !p.available }).eq('id', p.id).select().single();
      if (r.error) throw r.error;
    }, 'Product visibility updated.');
  }

  function deleteProduct(p: Product) {
    if (!confirm(`Are you sure you want to delete ${p.name}?`)) return;
    run(async () => {
      const r = await supabase!.from('products').delete().eq('id', p.id);
      if (r.error) throw r.error;
    }, 'Product deleted.');
  }

  /** Products whose SKU isn't in the SW-MNG001 form yet. */
  const oldSkuCount = products.filter((p) => !isCurrentSku(p.sku)).length;

  /** Gives every product without an SW-MNG001 SKU a new one, oldest first, and remakes its barcode from it. */
  function updateOldSkus() {
    if (
      !confirm(
        `Give ${oldSkuCount} product${oldSkuCount === 1 ? '' : 's'} a new SKU like SW-MNG001 and a new barcode made from it?\n\n` +
          'Barcode labels already printed for these products will stop scanning. Print new labels from Barcode under Action.'
      )
    )
      return;
    run(async () => {
      // Read the latest list, so numbers never clash with a product added from another screen.
      const latest = await supabase!.from('products').select('id,name,sku').order('created_at', { ascending: true });
      if (latest.error) throw latest.error;
      const rows = latest.data ?? [];
      const skus = rows.map((p) => String(p.sku ?? ''));
      for (const p of rows) {
        if (isCurrentSku(p.sku)) continue;
        const sku = generateSku(p.name, skus);
        const r = await supabase!.from('products').update({ sku, barcode: skuBarcode(sku) }).eq('id', p.id);
        if (r.error) throw new Error(`Stopped at ${p.name}: ${r.error.message}. Products before it were updated; press the button again to finish.`);
        skus.push(sku);
      }
    }, 'All products now have SW SKUs. Print new barcode labels from Barcode under Action.');
  }

  return {
    oldSkuCount,
    updateOldSkus,
    productEdit,
    setProductEdit,
    openProduct,
    saveProduct,
    toggleProduct,
    deleteProduct,
    barcodeModalProduct,
    setBarcodeModalProduct,
  };
}
