'use client';
import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase-admin';
import { Category } from '@/lib/admin';
import type { Draft } from '../config';
import type { AdminData } from './use-admin-data';

/** Adding and editing menu categories. */
export function useCategories({ run }: AdminData) {
  const [categoryEdit, setCategoryEdit] = useState<Draft<Category> | null>(null);

  function saveCategory(e: FormEvent) {
    e.preventDefault();
    if (!categoryEdit) return;
    run(async () => {
      const { id, ...values } = categoryEdit;
      values.name = values.name.trim();
      if (!values.name) throw new Error('Category name is required.');
      let r = id
        ? await supabase!.from('categories').update(values).eq('id', id).select().single()
        : await supabase!.from('categories').insert(values).select().single();
      if (r.error && r.error.message?.includes('image')) {
        const { image: _img, ...fallbackCat } = values;
        r = id
          ? await supabase!.from('categories').update(fallbackCat).eq('id', id).select().single()
          : await supabase!.from('categories').insert(fallbackCat).select().single();
      }
      if (r.error) throw r.error;
      setCategoryEdit(null);
    }, 'Category saved.');
  }

  return { categoryEdit, setCategoryEdit, saveCategory };
}
