'use client';
import Link from 'next/link';
import {PickupDetails} from '@/components/pickup-details';
import {PaymentProof} from '@/components/payment-proof';
import { useAuthUI } from '@/components/auth-dialog';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Check, Eye, EyeOff, Download, Heart, LogOut, MessageCircle, Package, ShoppingBag, Truck, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { money, Order } from '@/lib/admin';
import { PageHero } from '@/components/page-hero';
import { useCommerce } from '@/components/commerce';

// The journey every order goes through, shown as a tracker on each order card.
const journey = ['pending', 'confirmed', 'preparing', 'dispatched', 'delivered'] as const;
const journeyLabels: Record<string, string> = {
  pending: 'Pending',
  refunded: 'Refunded',
  confirmed: 'Confirmed',
  preparing: 'Not yet dispatched',
  dispatched: 'On its way',
  delivered: 'Delivered',
};

const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

export default function Account() {
  const router = useRouter();
  const { openLogin } = useAuthUI();
  const { cart, wishlist } = useCommerce();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword,setShowPassword]=useState(false);
  const [name, setName] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && !user) {
      openLogin();
      router.replace('/');
    }
  }, [ready, user, router, openLogin]);


  useEffect(() => {
    if (!supabase) {
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
      setUser(user);
      setOrders([]);
      setReady(true);
      if (user) {
        if (new URLSearchParams(window.location.search).get('next') === '/cart') {
          router.push('/cart');
          return;
        }
        const { data, error } = await client.from('orders').select('*').eq('customer_id', user.id).order('created_at', { ascending: false });
        if (disposed) return;
        if (error) setError('Could not load your orders. Please check database migrations.');
        else setOrders(data ?? []);
      }
    }
    check();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(() => setTimeout(check, 0));
    return () => {
      disposed = true;
      subscription.unsubscribe();
    };
  }, [router]);

  async function authenticate(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
        if (error) throw error;
        setNotice(data.session ? 'Welcome to the Swaadha family!' : 'Confirm your email, then sign in to continue.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }

  async function invoice(o: Order) {
    setBusy(true);
    setError('');
    try {
      const { downloadInvoice } = await import('@/lib/invoice');
      await downloadInvoice(o);
    } catch {
      setError('Could not generate your invoice. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const displayName = String(user?.user_metadata?.name || '').trim() || user?.email?.split('@')[0] || '';
  const firstName = displayName.split(' ')[0];
  const active = orders.filter((o) => !['delivered', 'cancelled', 'refunded'].includes(o.status)).length;
  const spent = orders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + Number(o.total), 0);
  const bagCount = cart.reduce((n, i) => n + i.quantity, 0);

  return (
    <>
      <PageHero
        compact
        kicker={
          <>
            <Heart size={12} /> {user ? 'My account' : 'A place at our table'}
          </>
        }
        lines={user ? [`Welcome home${firstName ? `, ${firstName}` : ''}.`, <em key="e">Your orders, with love.</em>] : ['Your little corner', <em key="e">of homemade.</em>]}
        text={user ? 'Follow every order from our kitchen to your door, and keep your invoices in one place.' : 'Shop your favorites, follow your orders, and download your invoices.'}
      />

      <section className="sw-section sw-account-page">
        {error && (
          <p className="sw-alert is-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="sw-alert is-success" role="status">
            {notice}
          </p>
        )}

        {!ready ? (
          <div className="sw-profile-skeleton" aria-busy="true">
            <span />
            <span />
          </div>
        ) : !user ? (
          null
        ) : (
          <div className="sw-profile">
            <aside className="sw-profile-card" data-reveal="up">
              <div className="sw-grain" />
              <div className="sw-profile-id">
                <span className="sw-profile-avatar">{(displayName.charAt(0) || 'S').toUpperCase()}</span>
                <div>
                  <b>{displayName}</b>
                  <small>{user.email}</small>
                </div>
              </div>
              <p className="sw-profile-since">Part of the Swaadha family since {dateLabel(user.created_at)}</p>

              <dl className="sw-profile-stats">
                <div>
                  <dt>{orders.length}</dt>
                  <dd>{orders.length === 1 ? 'Order' : 'Orders'}</dd>
                </div>
                <div>
                  <dt>{active}</dt>
                  <dd>In progress</dd>
                </div>
                <div className="is-wide">
                  <dt>{money(spent)}</dt>
                  <dd>Ordered with love</dd>
                </div>
              </dl>

              <nav className="sw-profile-links" aria-label="Account shortcuts">
                <Link href="/cart">
                  <ShoppingBag size={17} /> My bag <b>{bagCount}</b>
                </Link>
                <Link href="/wishlist">
                  <Heart size={17} /> My wishlist <b>{wishlist.length}</b>
                </Link>
                <Link className="sw-link" href="/contact">Contact our kitchen</Link>
              </nav>

              <button className="sw-profile-signout" onClick={() => supabase?.auth.signOut()}>
                <LogOut size={15} /> Sign out
              </button>
            </aside>

            <div className="sw-profile-main">
              <div className="sw-profile-head">
                <h2>
                  My orders <em>({orders.length})</em>
                </h2>
                <Link className="sw-btn is-gold" href="/products" data-magnetic>
                  <span>Back to the kitchen</span>
                  <ArrowUpRight size={17} />
                </Link>
              </div>

              {!orders.length ? (
                <div className="sw-empty sw-panel" data-reveal="up">
                  <span className="sw-empty-icon">
                    <Package size={28} />
                  </span>
                  <h3>Your first favorite awaits.</h3>
                  <p>Add a little goodness to your bag and place your first order. You’ll be able to follow it right here.</p>
                  <Link className="sw-btn is-red" href="/products">
                    <span>Explore our kitchen</span>
                    <ArrowUpRight size={17} />
                  </Link>
                </div>
              ) : (
                <div className="sw-orders" data-stagger>
                  {orders.map((o) => {
                    const step = journey.indexOf(o.status as (typeof journey)[number]);
                    const cancelled = o.status === 'cancelled';
                    return (
                      <article className="sw-order" key={o.id} data-reveal="up">
                        <header className="sw-order-head">
                          <div>
                            <b>Order #{o.id.slice(0, 8).toUpperCase()}</b>
                            <small>Placed on {dateLabel(o.created_at)}</small>
                          </div>
                          <span className={`sw-status is-${o.status}`}>{cancelled ? 'Cancelled' : journeyLabels[o.status] || o.status}</span>
                        </header>

                        {cancelled ? (
                          <p className="sw-order-cancelled">
                            <X size={15} /> This order was cancelled. Reach out to our kitchen if you have any questions.
                          </p>
                        ) : (
                          <ol className="sw-tracker" style={{ '--done': Math.max(step, 0) } as React.CSSProperties}>
                            {journey.map((s, i) => (
                              <li key={s} className={i < step ? 'is-done' : i === step ? 'is-current' : ''}>
                                <i>{i <= step ? <Check size={12} strokeWidth={3} /> : null}</i>
                                <span>{journeyLabels[s]}</span>
                              </li>
                            ))}
                          </ol>
                        )}

                        <ul className="sw-order-items">
                          {o.items.map((item, i) => (
                            <li key={i}>
                              <span>
                                {item.name}
                                <small>{item.weight}</small>
                              </span>
                              <b>× {item.quantity}</b>
                              <strong>{money(item.price * item.quantity)}</strong>
                            </li>
                          ))}
                        </ul>

                        <div className="sw-order-meta">
                          <div>
                            <small>Dispatch date</small>
                            <b>{o.requested_date}</b>
                          </div>
                          <div>
                            <small>Payment</small>
                            <b>
                              {(o.payment_method === 'COD' || !o.payment_method ? 'UPI / QR' : o.payment_method)} · {o.payment_status || 'unpaid'}
                            </b>
                          </div>
                          <div className="is-total">
                            <small>Total</small>
                            <strong>{money(o.total)}</strong>
                          </div>
                        </div>

                        <PickupDetails orderId={o.id}/>
                        <p className="sw-order-address">{[o.address, o.city, o.state, o.pincode].filter(Boolean).join(', ')}</p>
                        {o.awb_code && (
                          <p className="sw-order-address">
                            <Truck size={14} /> {o.courier_name} · AWB {o.awb_code}
                          </p>
                        )}

                        {o.status!=='cancelled'&&<details><summary>QR payment &amp; upload screenshot</summary><PaymentProof orderId={o.id}/></details>}
                        <div className="sw-order-links">
                          <button className="sw-chip" disabled={busy} onClick={() => invoice(o)}>
                            <Download size={14} /> Invoice PDF
                          </button>
                          {o.tracking_url?.startsWith('https://') && (
                            <a className="sw-chip is-red" href={o.tracking_url} target="_blank" rel="noreferrer">
                              <Truck size={14} /> Track delivery <ArrowUpRight size={13} />
                            </a>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        {!ready && <span className="sw-sr">Getting your table ready…</span>}
      </section>
    </>
  );
}
