'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase-admin';
import { Product } from '@/lib/products';
import { Order } from '@/lib/admin';
import { cleanBarcodeValue, legacyProductBarcode, productBarcode } from '../barcode';
import type { AdminData } from './use-admin-data';

type BillLine = { product: Product; quantity: number };
type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Pay Later';

/** The counter billing register: the bill, payment, change, and recording the sale. */
export function usePos({ products, run, setError, setNotice, setRevision }: AdminData) {
  const [posCart, setPosCart] = useState<BillLine[]>([]);
  const [posSearch, setPosSearch] = useState('');
  const [posCategory, setPosCategory] = useState('All');
  const [posCustomerName, setPosCustomerName] = useState('Counter Customer');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState<PaymentMethod>('Cash');
  const [posCashTendered, setPosCashTendered] = useState('');
  const [posDiscount, setPosDiscount] = useState<number>(0);
  const [posReceiptOrder, setPosReceiptOrder] = useState<Order | null>(null);
  // The product added most recently, so the bill can highlight it. `at` restarts the highlight on repeat adds.
  const [posLastAdded, setPosLastAdded] = useState<{ id: string; at: number } | null>(null);

  useEffect(() => {
    if (!posLastAdded) return;
    const fade = setTimeout(() => setPosLastAdded(null), 3000);
    return () => clearTimeout(fade);
  }, [posLastAdded]);

  /** Packs of a product still free to add to the bill: latest stock minus what's already in it. */
  function stockLeft(productId: string) {
    const stock = products.find((p) => p.id === productId)?.stock ?? 0;
    return stock - (posCart.find((item) => item.product.id === productId)?.quantity ?? 0);
  }

  const stockMessage = (p: Product) =>
    (p.stock ?? 0) > 0 ? `Only ${p.stock} of ${p.name} in stock, all already in the bill.` : `${p.name} is out of stock.`;

  /** Adds one pack to the bill. Returns false (and shows why) when there's no stock left for it. */
  function addToPosCart(p: Product) {
    if (stockLeft(p.id) < 1) {
      setError(stockMessage(products.find((x) => x.id === p.id) ?? p));
      return false;
    }
    setPosLastAdded({ id: p.id, at: Date.now() });
    setPosCart((prev) => {
      const existing = prev.find((item) => item.product.id === p.id);
      if (existing) {
        return prev.map((item) => (item.product.id === p.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...prev, { product: p, quantity: 1 }];
    });
    return true;
  }

  function updatePosQty(productId: string, delta: number) {
    if (delta > 0 && stockLeft(productId) < delta) {
      const p = products.find((x) => x.id === productId);
      if (p) setError(stockMessage(p));
      return;
    }
    setPosCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as BillLine[]
    );
  }

  function removeFromPosCart(productId: string) {
    setPosCart((prev) => prev.filter((item) => item.product.id !== productId));
  }

  /** The product whose barcode or SKU is exactly this code. */
  function productForCode(text: string): Product | undefined {
    const code = cleanBarcodeValue(text.trim());
    return (
      products.find((p) => productBarcode(p) === code || legacyProductBarcode(p) === code) ??
      products.find((p) => p.sku && cleanBarcodeValue(p.sku) === code)
    );
  }

  /**
   * Finds the product for a scanned code or typed text and adds it to the bill. Exact codes win
   * over name matches, so a scan never lands on the wrong product. `error` says why nothing was added.
   */
  function addScannedToPosCart(text: string): { product?: Product; error?: string } {
    const typed = text.trim();
    if (!typed) return {};
    const term = typed.toLowerCase();
    const found =
      productForCode(typed) ??
      products.find((p) => p.name.toLowerCase() === term) ??
      products.find((p) => p.name.toLowerCase().includes(term));
    if (!found) {
      setPosSearch(typed);
      setError(`No product matches "${typed}". Check the label or search by name.`);
      return { error: `No product for ${typed}` };
    }
    if (!addToPosCart(found)) return { product: found, error: stockMessage(found) };
    setPosSearch('');
    setError('');
    setNotice(`Added "${found.name}" to bill.`);
    return { product: found };
  }

  // A USB/Bluetooth barcode scanner types the code and presses Enter.
  function handlePosBarcodeKeydown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' || !posSearch.trim()) return;
    e.preventDefault();
    addScannedToPosCart(posSearch);
  }

  const posSubtotal = useMemo(() => posCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [posCart]);
  const posGrandTotal = useMemo(() => Math.max(0, posSubtotal - posDiscount), [posSubtotal, posDiscount]);
  const posChangeReturn = useMemo(() => {
    const cash = Number(posCashTendered) || 0;
    return posPaymentMethod === 'Cash' && cash >= posGrandTotal ? cash - posGrandTotal : 0;
  }, [posCashTendered, posGrandTotal, posPaymentMethod]);

  function completePosOrder() {
    if (!posCart.length) {
      setError('Please add at least one product to the POS register bill.');
      return;
    }
    run(async () => {
      // One database step records the sale and takes the stock, or does neither (e.g. not enough stock).
      const res = await supabase!.rpc('record_pos_sale', {
        p_customer_name: posCustomerName,
        p_phone: posCustomerPhone,
        p_payment_method: posPaymentMethod,
        p_discount: posDiscount,
        p_items: posCart.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
      });
      if (res.error) {
        throw new Error(
          /record_pos_sale/.test(res.error.message)
            ? 'POS sales need a database update. Run supabase/007-pos-sale-stock.sql in the Supabase SQL editor.'
            : res.error.message
        );
      }

      setPosReceiptOrder(res.data as Order);
      setPosCart([]);
      setPosCashTendered('');
      setPosDiscount(0);
      setPosCustomerName('Counter Customer');
      setPosCustomerPhone('');
      setRevision((n) => n + 1);
    }, 'POS Sale completed and recorded in orders.');
  }

  return {
    posCart,
    setPosCart,
    posSearch,
    setPosSearch,
    posCategory,
    setPosCategory,
    posCustomerName,
    setPosCustomerName,
    posCustomerPhone,
    setPosCustomerPhone,
    posPaymentMethod,
    setPosPaymentMethod,
    posCashTendered,
    setPosCashTendered,
    posDiscount,
    setPosDiscount,
    posReceiptOrder,
    setPosReceiptOrder,
    posSubtotal,
    posGrandTotal,
    posChangeReturn,
    addToPosCart,
    updatePosQty,
    removeFromPosCart,
    handlePosBarcodeKeydown,
    addScannedToPosCart,
    posLastAdded,
    productForCode,
    completePosOrder,
  };
}
