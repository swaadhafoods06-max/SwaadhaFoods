'use client';
import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/products';
import { Order } from '@/lib/admin';
import { cleanBarcodeValue, legacyProductBarcode, productBarcode } from '../barcode';
import { today } from '../config';
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

  function addToPosCart(p: Product) {
    setPosCart((prev) => {
      const existing = prev.find((item) => item.product.id === p.id);
      if (existing) {
        return prev.map((item) => (item.product.id === p.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...prev, { product: p, quantity: 1 }];
    });
  }

  function updatePosQty(productId: string, delta: number) {
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

  /**
   * Finds the product for a scanned code or typed text and adds it to the bill. Exact codes win
   * over name matches, so a scan never lands on the wrong product. Returns the product, if any.
   */
  function addScannedToPosCart(text: string): Product | undefined {
    const typed = text.trim();
    if (!typed) return;
    const code = cleanBarcodeValue(typed);
    const term = typed.toLowerCase();
    const found =
      products.find((p) => productBarcode(p) === code || legacyProductBarcode(p) === code) ??
      products.find((p) => p.sku && cleanBarcodeValue(p.sku) === code) ??
      products.find((p) => p.name.toLowerCase() === term) ??
      products.find((p) => p.name.toLowerCase().includes(term));
    if (found) {
      addToPosCart(found);
      setPosSearch('');
      setError('');
      setNotice(`Added "${found.name}" to bill.`);
    } else {
      setPosSearch(typed);
      setError(`No product matches "${typed}". Check the label or search by name.`);
    }
    return found;
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
      const orderNumber = `POS-${Date.now().toString().slice(-6)}`;
      const newOrderPayload = {
        customer_name: posCustomerName.trim() || 'Counter Customer',
        phone: posCustomerPhone.trim() || '9999999999',
        address: 'Kitchen Counter / In-Store POS',
        requested_date: today(),
        status: 'delivered',
        payment_method: `POS (${posPaymentMethod})`,
        payment_status: 'paid',
        total: posGrandTotal,
        discount: posDiscount,
        invoice_number: orderNumber,
        items: posCart.map((item) => ({
          product_id: item.product.id,
          name: item.product.name,
          weight: item.product.weight,
          price: item.product.price,
          quantity: item.quantity,
        })),
      };

      const res = await supabase!.from('orders').insert(newOrderPayload).select().single();
      if (res.error) throw res.error;

      // Update product inventory stock
      for (const item of posCart) {
        const nextStock = Math.max(0, (item.product.stock ?? 0) - item.quantity);
        await supabase!.from('products').update({ stock: nextStock }).eq('id', item.product.id);
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
    completePosOrder,
  };
}
