'use client';
import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Member, MemberDraft, passwordProblem } from '@/lib/admin';
import type { AdminData } from './use-admin-data';

/** Sub-admins, their login password and which pages they can open. Owner only. */
export function useTeam({ run }: AdminData) {
  const [memberEdit, setMemberEdit] = useState<MemberDraft | null>(null);

  function saveMember(e: FormEvent) {
    e.preventDefault();
    if (!memberEdit) return;
    const password = memberEdit.password || '';
    run(async () => {
      if (!memberEdit.permissions.length) throw new Error('Choose at least one tab this sub-admin can open.');
      if (password && passwordProblem(password)) throw new Error(passwordProblem(password));
      const {
        data: { session },
      } = await supabase!.auth.getSession();
      if (!session) throw new Error('Sign in again to manage sub-admins.');
      // Goes through the server so a login account can be created or its password reset.
      const response = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          user_id: memberEdit.user_id,
          email: memberEdit.email,
          name: memberEdit.name,
          password,
          permissions: memberEdit.permissions,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not save this sub-admin.');
      setMemberEdit(null);
    }, memberEdit.user_id ? (password ? 'Sub-admin access and password updated.' : 'Sub-admin access saved.') : 'Sub-admin saved. They can now sign in.');
  }

  function revokeMember(m: Member) {
    if (!confirm(`Remove admin access for ${m.name}? Their account stays, but they can no longer open the admin.`)) return;
    run(async () => {
      const r = await supabase!.rpc('revoke_staff', { p_id: m.user_id });
      if (r.error) throw r.error;
    }, 'Sub-admin access removed.');
  }

  return { memberEdit, setMemberEdit, saveMember, revokeMember };
}
