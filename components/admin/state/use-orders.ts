'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase-admin';
import { Order } from '@/lib/admin';
import type { AdminData } from './use-admin-data';

/** Order details popup, status changes and invoice downloads. */
export function useOrders({ run, setBusy, setError, setNotice }: AdminData) {
  const [orderDetail, setOrderDetail] = useState<Order | null>(null);

  function changeStatus(order: Order, status: string) {
    run(async () => {
      const r = await supabase!.rpc('set_order_status', { p_id: order.id, p_status: status });
      if (r.error) throw r.error;
      setOrderDetail((old) => (old?.id === order.id ? { ...old, status } : old));
    }, 'Order status updated.');
  }

  function changePaymentStatus(order: Order, status: 'unpaid' | 'paid' | 'rejected') {
    run(async () => {
      const r = await supabase!.rpc('set_payment_status', { p_id: order.id, p_status: status });
      if (r.error) throw r.error;
    }, status === 'paid' ? 'Payment marked as verified.' : status === 'rejected' ? 'Payment marked as rejected.' : 'Payment marked as unpaid.');
  }

  async function invoice(order: Order) {
    setBusy(true);
    setError('');
    try {
      const { downloadInvoice } = await import('@/lib/invoice');
      await downloadInvoice(order);
      setNotice('Invoice PDF downloaded.');
    } catch {
      setError('Could not generate the invoice. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return { orderDetail, setOrderDetail, changeStatus, changePaymentStatus, invoice };
}
