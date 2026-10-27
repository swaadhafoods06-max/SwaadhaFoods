import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { passwordProblem } from '@/lib/admin';

export const runtime = 'nodejs';

const tabIds = ['dashboard', 'pos', 'categories', 'products', 'banners', 'coupons', 'orders', 'reports'];

/**
 * Creates or updates a sub-admin. Owner only.
 * With a password, a new login account is created (or an existing sub-admin's password is reset),
 * which needs the server-only service-role key. Tab access itself is saved through `save_staff`
 * as the signed-in owner, so the database still enforces every owner check.
 */
export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = request.headers.get('authorization');
  if (!url || !key) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  if (!authorization?.startsWith('Bearer ')) return NextResponse.json({ error: 'Sign in to manage sub-admins.' }, { status: 401 });

  const userClient = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser(authorization.slice(7));
  if (authError || !user) return NextResponse.json({ error: 'Your session has expired. Sign in again.' }, { status: 401 });
  const owner = await userClient.rpc('has_tab', { tab_name: 'team' });
  if (owner.error || !owner.data) return NextResponse.json({ error: 'Owner access required.' }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const userId = typeof body.user_id === 'string' && body.user_id ? body.user_id : null;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const permissions = body.permissions;
  if (userId && !/^[0-9a-f-]{36}$/i.test(userId)) return NextResponse.json({ error: 'Invalid sub-admin.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  if (!name || name.length > 100) return NextResponse.json({ error: 'Enter a name up to 100 characters.' }, { status: 400 });
  if (!Array.isArray(permissions) || !permissions.every((p) => tabIds.includes(p)))
    return NextResponse.json({ error: 'Invalid tab permissions.' }, { status: 400 });
  if (!permissions.length) return NextResponse.json({ error: 'Choose at least one tab this sub-admin can open.' }, { status: 400 });
  if (password) {
    const problem = passwordProblem(password);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    if (!service)
      return NextResponse.json({ error: 'Add the server-only SUPABASE_SERVICE_ROLE_KEY to create sub-admin passwords.' }, { status: 503 });
  }

  const admin = service ? createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  const saveAccess = () => userClient.rpc('save_staff', { p_email: email, p_name: name, p_permissions: permissions });

  // Editing an existing sub-admin: update access, and reset the password if one was entered.
  if (userId) {
    if (password) {
      const target = await admin!.from('admins').select('role,email').eq('user_id', userId).maybeSingle();
      if (target.error || !target.data) return NextResponse.json({ error: 'Sub-admin not found.' }, { status: 404 });
      if (target.data.role !== 'staff') return NextResponse.json({ error: 'Owner passwords cannot be changed here.' }, { status: 403 });
      if (target.data.email !== email) return NextResponse.json({ error: 'The email does not match this sub-admin.' }, { status: 400 });
    }
    const saved = await saveAccess();
    if (saved.error) return NextResponse.json({ error: saved.error.message }, { status: 400 });
    if (password) {
      const reset = await admin!.auth.admin.updateUserById(userId, { password });
      if (reset.error) return NextResponse.json({ error: `Access saved, but the password was not changed: ${reset.error.message}` }, { status: 400 });
      return NextResponse.json({ message: 'Sub-admin access and password updated.' });
    }
    return NextResponse.json({ message: 'Sub-admin access saved.' });
  }

  // Adding without a password: grant access to an account that already exists.
  if (!password) {
    const saved = await saveAccess();
    if (saved.error) {
      const missing = /create an account first/i.test(saved.error.message);
      return NextResponse.json(
        { error: missing ? 'No account exists for this email yet. Set a password to create one.' : saved.error.message },
        { status: 400 }
      );
    }
    return NextResponse.json({ message: 'Sub-admin access granted to the existing account.' });
  }

  // Adding with a password: create a confirmed login account, then grant access.
  const created = await admin!.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
  if (created.error || !created.data.user) {
    const exists = created.error?.code === 'email_exists' || /already (been )?registered/i.test(created.error?.message || '');
    return NextResponse.json(
      {
        error: exists
          ? 'An account already exists for this email. Leave the password blank to give them access with their current password.'
          : created.error?.message || 'Could not create the account.',
      },
      { status: exists ? 409 : 400 }
    );
  }
  const saved = await saveAccess();
  if (saved.error) {
    await admin!.auth.admin.deleteUser(created.data.user.id);
    return NextResponse.json({ error: saved.error.message }, { status: 400 });
  }
  return NextResponse.json({ message: 'Sub-admin created. Share the email and password with them so they can sign in.' });
}
