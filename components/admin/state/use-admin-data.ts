'use client';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-admin';
import { Product, withDetails } from '@/lib/products';
import { Banner, calculateMetrics, Category, Coupon, exportCsv, Member, Metrics, Order, Tab, tabs } from '@/lib/admin';
import { emptyMetrics, startDate, today } from '../config';

/**
 * The admin session and everything loaded from Supabase: who is signed in, which page is open,
 * the kitchen data, report dates, search filters, and the success/error messages.
 */
export function useAdminData() {
  const pathname = usePathname();
  const router = useRouter();
  const segment = pathname.split('/')[2] ?? '';
  const tab: Tab = (tabs as readonly string[]).includes(segment) ? (segment as Tab) : 'dashboard';

  const [ready, setReady] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);

  const [from, setFrom] = useState(startDate);
  const [to, setTo] = useState(today);
  const [query, setQuery] = useState('');
  const [orderStatus, setOrderStatus] = useState('all');

  const can = (t: Tab) => !!member && (member.role === 'owner' || (t !== 'team' && member.permissions.includes(t)));

  // Who is signed in, and are they an admin?
  useEffect(() => {
    if (!supabase) {
      setError('Supabase client is not available.');
      setReady(true);
      return;
    }

    const client = supabase;
    let disposed = false;
    async function check() {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (disposed) return;

      if (user) {
        const { data, error } = await client.from('admins').select('*').eq('user_id', user.id).maybeSingle();
        if (disposed) return;
        if (error) {
          setError('Could not verify admin access. Run the Supabase migrations and try again.');
        } else if (data) {
          setMember({ ...data, email: data.email || user.email || '' });
        } else {
          setError('This account has no admin access. Please insert your user into public.admins via Supabase SQL Editor.');
        }
      } else {
        setMember(null);
      }
      setReady(true);
    }
    check();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(() => {
      setTimeout(check, 0);
    });
    return () => {
      disposed = true;
      subscription.unsubscribe();
    };
  }, []);

  // Sub-admins who open a page they can't use are sent to their first permitted page.
  useEffect(() => {
    if (!member) return;
    const permitted = tabs.filter((t) => member.role === 'owner' || (t !== 'team' && member.permissions.includes(t)));
    if (!permitted.includes(tab)) router.replace(`/admin/${permitted[0] ?? 'dashboard'}`);
  }, [member, tab, router]);

  // Success messages fade away on their own; errors stay until the next action.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Each page starts fresh: clear the search box and messages and return to the top.
  useEffect(() => {
    setQuery('');
    setError('');
    setNotice('');
    window.scrollTo(0, 0);
  }, [tab]);

  // Load everything this admin is allowed to see. Re-runs after every save (revision).
  useEffect(() => {
    if (!supabase || !member || !from || !to || from > to) return;
    const client = supabase;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const failures: string[] = [];

      await Promise.all([
        (async () => {
          if (member!.role === 'owner' || member!.permissions.includes('products')) {
            const r = await client.from('products').select('*').order('created_at', { ascending: false });
            if (r.error) failures.push(r.error.message);
            else if (!cancelled) setProducts((r.data ?? []).map(withDetails));
          }
        })(),
        (async () => {
          if (member!.role === 'owner' || member!.permissions.some((p) => ['categories', 'products'].includes(p))) {
            const r = await client.from('categories').select('*').order('name');
            if (r.error) failures.push(r.error.message);
            else if (!cancelled) setCategories(r.data ?? []);
          }
        })(),
        (async () => {
          if (member!.role === 'owner' || member!.permissions.includes('banners')) {
            const r = await client.from('banners').select('*').order('display_order', { ascending: true });
            if (r.error) failures.push(r.error.message);
            else if (!cancelled) setBanners(r.data ?? []);
          }
        })(),
        (async () => {
          if (member!.role === 'owner' || member!.permissions.includes('coupons')) {
            const r = await client.from('coupons').select('*').order('created_at', { ascending: false });
            if (r.error) failures.push(r.error.message);
            else if (!cancelled) setCoupons(r.data ?? []);
          }
        })(),
        (async () => {
          if (member!.role === 'owner' || member!.permissions.includes('orders')) {
            const r = await client.from('orders').select('*').order('created_at', { ascending: false });
            if (r.error) failures.push(r.error.message);
            else if (!cancelled) setOrders(r.data ?? []);
          }
        })(),
        (async () => {
          if (member!.role === 'owner') {
            const r = await client.from('admins').select('*').order('name');
            if (r.error) failures.push(r.error.message);
            else if (!cancelled) setMembers(r.data ?? []);
          }
        })(),
        (async () => {
          if (member!.role === 'owner' || member!.permissions.some((p) => ['dashboard', 'reports'].includes(p))) {
            const r = await client.rpc('admin_metrics', { p_from: from, p_to: to });
            if (r.error) failures.push(r.error.message);
            else if (!cancelled) setMetrics(r.data);
          }
        })(),
      ]);

      if (!cancelled) {
        setLoading(false);
        if (failures.length) setError(failures.join(' · '));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [member, from, to, revision]);

  const report = useMemo(
    () =>
      metrics.total_orders || !orders.length
        ? metrics
        : calculateMetrics(
            orders,
            products.filter((p) => categories.some((c) => c.name === p.category && c.enabled)),
            from,
            to
          ),
    [metrics, orders, products, categories, from, to]
  );

  const matchedProducts = products.filter((p) =>
    `${p.name} ${p.category} ${p.sku || ''} ${p.barcode || ''}`.toLowerCase().includes(query.toLowerCase())
  );
  const matchedOrders = orders.filter(
    (o) => (orderStatus === 'all' || o.status === orderStatus) && `${o.id} ${o.customer_name} ${o.phone}`.toLowerCase().includes(query.toLowerCase())
  );
  const matchedBanners = banners.filter((b) => `${b.title} ${b.tag} ${b.label}`.toLowerCase().includes(query.toLowerCase()));
  const matchedCoupons = coupons.filter((c) => `${c.code} ${c.description}`.toLowerCase().includes(query.toLowerCase()));

  /** Runs a save/delete, shows the message, and reloads the data. */
  async function run(task: () => Promise<void>, message: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await task();
      setNotice(message);
      setRevision((n) => n + 1);
    } catch (e) {
      setError((e as { message?: string })?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function login(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    run(async () => {
      const r = await supabase!.auth.signInWithPassword({ email, password });
      if (r.error) throw r.error;
    }, 'Signed in.');
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setMember(null);
    setNotice('');
  }

  function downloadReport() {
    exportCsv(`swaadha-report-${from}-to-${to}.csv`, [
      ['Swaadha order activity report', 'LIVE DATA'],
      ['Period start', from],
      ['Period end', to],
      ['Order value excludes cancellations; this is not collected revenue.'],
      [],
      ['Date', 'Orders', 'Order value (INR)'],
      ...report.daily.map((d) => [d.day, d.orders, d.value]),
      [],
      ['Status', 'Order count'],
      ...report.by_status.map((s) => [s.status, s.count]),
      [],
      ['Product', 'Units ordered', 'Order value (INR)'],
      ...report.top_products.map((p) => [p.name, p.quantity, p.value]),
    ]);
  }

  return {
    tab,
    ready,
    member,
    email,
    setEmail,
    password,
    setPassword,
    login,
    signOut,
    can,
    products,
    categories,
    orders,
    members,
    banners,
    coupons,
    report,
    error,
    setError,
    notice,
    setNotice,
    busy,
    setBusy,
    loading,
    setRevision,
    run,
    from,
    setFrom,
    to,
    setTo,
    query,
    setQuery,
    orderStatus,
    setOrderStatus,
    matchedProducts,
    matchedOrders,
    matchedBanners,
    matchedCoupons,
    downloadReport,
  };
}

export type AdminData = ReturnType<typeof useAdminData>;
