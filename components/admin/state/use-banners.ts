'use client';
import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase-admin';
import { Banner } from '@/lib/admin';
import type { Draft } from '../config';
import type { AdminData } from './use-admin-data';

/** The homepage hero slides: add, edit, show/hide, delete. */
export function useBanners({ run }: AdminData) {
  const [bannerEdit, setBannerEdit] = useState<Draft<Banner> | null>(null);

  function saveBanner(e: FormEvent) {
    e.preventDefault();
    if (!bannerEdit) return;
    run(async () => {
      const { id, ...values } = bannerEdit;
      values.title = values.title.trim();
      if (!values.title) throw new Error('Banner title is required.');
      if (!values.image) throw new Error('Banner image is required. Upload an image or enter a URL.');
      const r = id
        ? await supabase!.from('banners').update(values).eq('id', id).select().single()
        : await supabase!.from('banners').insert(values).select().single();
      if (r.error) throw r.error;
      setBannerEdit(null);
    }, 'Banner saved.');
  }

  function toggleBanner(b: Banner) {
    run(async () => {
      const r = await supabase!.from('banners').update({ is_active: !b.is_active }).eq('id', b.id).select().single();
      if (r.error) throw r.error;
    }, 'Banner status updated.');
  }

  function deleteBanner(b: Banner) {
    if (!confirm(`Delete banner "${b.title}"?`)) return;
    run(async () => {
      const r = await supabase!.from('banners').delete().eq('id', b.id);
      if (r.error) throw r.error;
    }, 'Banner deleted.');
  }

  return { bannerEdit, setBannerEdit, saveBanner, toggleBanner, deleteBanner };
}
