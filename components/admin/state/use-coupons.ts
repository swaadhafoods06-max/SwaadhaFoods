'use client';
import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase-admin';
import { Coupon } from '@/lib/admin';
import type { Draft } from '../config';
import type { AdminData } from './use-admin-data';

/** Discount codes: add, edit, enable/disable, delete. */
export function useCoupons({ run }: AdminData) {
  const [couponEdit, setCouponEdit] = useState<Draft<Coupon> | null>(null);

  function saveCoupon(e: FormEvent) {
    e.preventDefault();
    if (!couponEdit) return;
    run(async () => {
      const { id, ...values } = couponEdit;
      values.code = values.code.trim().toUpperCase();
      if (!values.code) throw new Error('Coupon code is required.');
      if (values.discount_value <= 0) throw new Error('Discount value must be greater than zero.');
      if (values.discount_type === 'percentage' && values.discount_value > 100) {
        throw new Error('Percentage discount cannot exceed 100%.');
      }
      const r = id
        ? await supabase!.from('coupons').update(values).eq('id', id).select().single()
        : await supabase!.from('coupons').insert(values).select().single();
      if (r.error) throw r.error;
      setCouponEdit(null);
    }, 'Coupon saved.');
  }

  function toggleCoupon(c: Coupon) {
    run(async () => {
      const r = await supabase!.from('coupons').update({ is_active: !c.is_active }).eq('id', c.id).select().single();
      if (r.error) throw r.error;
    }, 'Coupon status updated.');
  }

  function deleteCoupon(c: Coupon) {
    if (!confirm(`Delete coupon "${c.code}"?`)) return;
    run(async () => {
      const r = await supabase!.from('coupons').delete().eq('id', c.id);
      if (r.error) throw r.error;
    }, 'Coupon deleted.');
  }

  return { couponEdit, setCouponEdit, saveCoupon, toggleCoupon, deleteCoupon };
}
