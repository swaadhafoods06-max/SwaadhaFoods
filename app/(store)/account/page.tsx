'use client';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Check, Eye, EyeOff, Download, Heart, LogOut, MessageCircle, Package, ShoppingBag, Truck, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { money, Order } from '@/lib/admin';
import { whatsapp } from '@/lib/products';
import { PageHero } from '@/components/page-hero';
import { useCommerce } from '@/components/commerce';

// The journey every order goes through, shown as a tracker on each order card.
const journey = ['pending', 'confirmed', 'preparing', 'dispatched', 'delivered'] as const;
const journeyLabels: Record<string, string> = {
  pending: 'Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  dispatched: 'On its way',
  delivered: 'Delivered',
};

const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

export default function Account() {
  const router = useRouter();
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
  const active = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;
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
          <div className="sw-account-grid">
            <div className="sw-account-welcome" data-reveal="up">
              <div className="sw-grain" />
              <div className="sw-account-medallion">
                <img src="/family-logo.png" alt="" />
              </div>
              <span className="sw-kicker is-light">The Swaadha family table</span>
              <h2>
                A few favorites.
                <br />
                <em>A familiar feeling.</em>
              </h2>
              <ul>
                <li>
                  <span>
                    <ShoppingBag size={18} />
                  </span>
                  Save your bag and check out in a moment
                </li>
                <li>
                  <span>
                    <Truck size={18} />
                  </span>
                  Follow each order from our kitchen to your door
                </li>
                <li>
                  <span>
                    <Download size={18} />
                  </span>
                  Keep every invoice in one place
                </li>
              </ul>
            </div>

            <form className="sw-panel sw-form sw-account-form" onSubmit={authenticate} data-reveal="up">
              <div className="sw-toggle" data-active={mode === 'login' ? 'login' : 'register'}>
                <span aria-hidden="true" />
                <button type="button" aria-pressed={mode === 'login'} onClick={() => setMode('login')}>
                  Sign in
                </button>
                <button type="button" aria-pressed={mode === 'signup'} onClick={() => setMode('signup')}>
                  Create account
                </button>
              </div>
              <h3>{mode === 'login' ? 'Lovely to see you again.' : 'Join the Swaadha table.'}</h3>
              {mode === 'signup' && (
                <label className="sw-field">
                  <span>Your name</span>
                  <div className="sw-input">
                    <input required autoComplete="name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                </label>
              )}
              <label className="sw-field">
                <span>Email address</span>
                <div className="sw-input">
                  <input required type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </label>
              <label className="sw-field">
                <span>Password</span>
                <div className="sw-input">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    minLength={8}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" className="sw-password-toggle" aria-label={showPassword?"Hide password":"Show password"} aria-pressed={showPassword} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button>
                </div>
              </label>
              <button className="sw-btn is-red is-block" disabled={!supabase || busy}>
                <span>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in to my account' : 'Create my account'}</span>
                <ArrowUpRight size={17} />
              </button>
              <small className="sw-hint">
                {mode === 'signup' ? 'Use at least 8 characters. Confirm your email before signing in.' : 'Your cart stays saved in this browser while you sign in.'}
              </small>
              <p className="sw-account-staff">
                Kitchen team member?{' '}
                <Link className="sw-link" href="/admin">
                  Admin sign in <ArrowUpRight size={13} />
                </Link>
              </p>
            </form>
          </div>
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
                <a href={whatsapp('Hello Swaadha! I have a question about my order.')} target="_blank" rel="noreferrer">
                  <MessageCircle size={17} /> Ask our kitchen <ArrowUpRight size={14} />
                </a>
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
                              {o.payment_method || 'Cash on delivery'} · {o.payment_status || 'unpaid'}
                            </b>
                          </div>
                          <div className="is-total">
                            <small>Total</small>
                            <strong>{money(o.total)}</strong>
                          </div>
                        </div>

                        <p className="sw-order-address">{[o.address, o.city, o.state, o.pincode].filter(Boolean).join(', ')}</p>
                        {o.awb_code && (
                          <p className="sw-order-address">
                            <Truck size={14} /> {o.courier_name} · AWB {o.awb_code}
                          </p>
                        )}

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
