'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowUpRight, CalendarDays, Check, Leaf, LockKeyhole, Minus, Plus, ShieldCheck, ShoppingBag, Tag, Trash2, Truck, X } from 'lucide-react';
import { useAuthUI } from '@/components/auth-dialog';
import { useCommerce } from '@/components/commerce';
import { Lines } from '@/components/motion';
import { PageHero } from '@/components/page-hero';
import { FALLBACK_IMAGE, ProductCard } from '@/components/product-card';
import { loadMenu, validateCouponCode } from '@/lib/storefront';
import { Product } from '@/lib/products';
import { money } from '@/lib/admin';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

function earliest() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export default function Cart() {
  const { openLogin } = useAuthUI();
  const { cart, quantity, remove, clear, ready } = useCommerce();
  const [menu, setMenu] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pin, setPin] = useState('');
  const [date, setDate] = useState(earliest);
  const [checkoutKey, setCheckoutKey] = useState('');
  const [authReady, setAuthReady] = useState(!supabase);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_amount: number; message: string } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);

  useEffect(() => {
    loadMenu()
      .then((d) => {
        setMenu(d.products);
        setLoaded(true);
      })
      .catch((e) => setError(e.message));

    if (!supabase) return;
    const client = supabase;
    async function check() {
      const {
        data: { user },
      } = await client.auth.getUser();
      setUser(user);
      setAuthReady(true);
      if (user?.user_metadata?.name) setName(String(user.user_metadata.name));
    }
    check();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(() => setTimeout(check, 0));
    return () => subscription.unsubscribe();
  }, []);

  // Fingerprint for checkout session
  useEffect(() => {
    if (!ready || !authReady) return;
    const fingerprint = (user?.id || 'guest') + JSON.stringify(cart.map((i) => [i.product.id, i.quantity]));
    let previous;
    try {
      previous = JSON.parse(sessionStorage.getItem('swaadha-checkout-attempt') || 'null');
    } catch {}
    const key = previous?.fingerprint === fingerprint ? previous.key : crypto.randomUUID();
    sessionStorage.setItem('swaadha-checkout-attempt', JSON.stringify({ fingerprint, key }));
    setCheckoutKey(key);
  }, [cart, user, ready, authReady]);

  const rows = cart.map((item) => ({ ...item, current: menu.find((p) => p.id === item.product.id) }));
  const invalid = !loaded || rows.some((i) => !i.current || i.quantity > (i.current.stock ?? 0));
  const subtotal = rows.reduce((sum, item) => sum + Number(item.current?.price ?? item.product.price) * item.quantity, 0);
  const discount = appliedCoupon ? appliedCoupon.discount_amount : 0;
  const finalTotal = Math.max(0, subtotal - discount);

  // Re-verify coupon if subtotal changes
  useEffect(() => {
    if (appliedCoupon && subtotal > 0) {
      validateCouponCode(appliedCoupon.code, subtotal).then((res) => {
        if (!res.valid) {
          setAppliedCoupon(null);
          setCouponError(res.message);
          setCouponSuccess('');
        } else {
          setAppliedCoupon({ code: appliedCoupon.code, discount_amount: res.discount_amount, message: res.message });
        }
      });
    }
  }, [subtotal]);

  async function applyCoupon(e: FormEvent) {
    e.preventDefault();
    if (!couponCode.trim() || couponBusy) return;
    setCouponBusy(true);
    setCouponError('');
    setCouponSuccess('');
    try {
      const res = await validateCouponCode(couponCode, subtotal);
      if (!res.valid) {
        setCouponError(res.message);
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon({ code: couponCode.trim().toUpperCase(), discount_amount: res.discount_amount, message: res.message });
        setCouponSuccess(res.message);
      }
    } catch (err: unknown) {
      setCouponError((err as { message?: string })?.message || 'Could not validate coupon.');
    } finally {
      setCouponBusy(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponSuccess('');
    setCouponError('');
  }

  async function place(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !user || busy) return;
    setBusy(true);
    setError('');
    try {
      const latest = await loadMenu();
      setMenu(latest.products);
      if (
        cart.some((item) => {
          const p = latest.products.find((p) => p.id === item.product.id);
          return !p || item.quantity > (p.stock ?? 0);
        })
      ) {
        throw new Error('A product’s availability changed. Please review your cart.');
      }

      const payload: Record<string, unknown> = {
        p_name: name,
        p_phone: phone,
        p_address: address,
        p_city: city,
        p_state: state,
        p_pincode: pin,
        p_date: date,
        p_items: cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        p_checkout_key: checkoutKey,
        p_coupon_code: appliedCoupon ? appliedCoupon.code : null,
      };

      let res = await supabase.rpc('place_order', payload);
      // Fallback if place_order does not yet take p_coupon_code
      if (res.error && res.error.message && res.error.message.includes('place_order')) {
        delete payload.p_coupon_code;
        res = await supabase.rpc('place_order', payload);
      }

      if (res.error) throw res.error;
      setSuccess(String(res.data));
      sessionStorage.removeItem('swaadha-checkout-attempt');
      clear();
    } catch (e) {
      setError((e as { message?: string })?.message || 'Could not place your order. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <section className="sw-section sw-success">
        <span className="sw-success-check" aria-hidden="true">
          <Check size={38} />
        </span>
        <span className="sw-kicker">A little goodness is on its way</span>
        <Lines as="h1" lines={['Your order', <>is <em>in the kitchen.</em></>]} />
        <p>
          Order #{success.slice(0, 8).toUpperCase()} has been placed.
          <br />
          Payment: cash on delivery. Your kitchen will confirm preparation and delivery.
        </p>
        <Link className="sw-btn is-red" href="/account" data-magnetic>
          <span>View my orders &amp; invoice</span>
          <ArrowUpRight size={17} />
        </Link>
      </section>
    );
  }

  const packs = cart.reduce((n, i) => n + i.quantity, 0);
  // A few favorites that aren't in the bag yet.
  const suggestions = menu.filter((p) => (p.stock ?? 0) > 0 && !cart.some((i) => i.product.id === p.id)).slice(0, 5);
  const suggestionRow = suggestions.length > 0 && (
    <div className="sw-cart-more">
      <div className="sw-head is-split">
        <div>
          <span className="sw-kicker">Fresh from our kitchen</span>
          <h2>
            {cart.length ? 'Add a little ' : 'Start with a '}
            <em>{cart.length ? 'more.' : 'favorite.'}</em>
          </h2>
        </div>
        <Link className="sw-link" href="/products">
          See the whole kitchen <ArrowUpRight size={15} />
        </Link>
      </div>
      <div className="sw-grid" data-stagger>
        {suggestions.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );

  return (
    <>
      <PageHero
        compact
        kicker={
          <>
            <ShoppingBag size={12} /> Your bag of goodness
          </>
        }
        lines={['A little cart.', <em key="e">A lot to love.</em>]}
      />
      <section className="sw-section sw-cart">
        {error && (
          <p className="sw-alert is-error" role="alert">
            {error}
          </p>
        )}

        {!ready ? (
          <p className="sw-muted">Loading your cart…</p>
        ) : !cart.length ? (
          <div className="sw-empty" data-reveal="up">
            <span className="sw-empty-icon">
              <ShoppingBag size={30} />
            </span>
            <h2>Your cart is waiting for a favorite.</h2>
            <p>Sweets, snacks, spices and pickles — all made fresh in small batches.</p>
            <Link className="sw-btn is-red" href="/products" data-magnetic>
              <span>Explore our kitchen</span>
              <ArrowUpRight size={17} />
            </Link>
          </div>
        ) : (
          <div className="sw-cart-layout">
            <div>
              <ol className="sw-steps" aria-label="Checkout steps">
                <li className="is-done">
                  <i>
                    <Check size={13} strokeWidth={3} />
                  </i>
                  <span>Your bag</span>
                </li>
                <li className={user ? 'is-current' : ''}>
                  <i>2</i>
                  <span>Delivery details</span>
                </li>
                <li>
                  <i>3</i>
                  <span>Place order</span>
                </li>
              </ol>
              <div className="sw-cart-list-head">
                <h2>
                  Your bag <em>({packs} {packs === 1 ? 'pack' : 'packs'})</em>
                </h2>
                <Link className="sw-link" href="/products">
                  Add more <ArrowUpRight size={14} />
                </Link>
              </div>
              <div className="sw-cart-list" data-stagger>
                {rows.map(({ product: p, quantity: n, current }) => {
                  const max = Math.min(current?.stock ?? 100, 100) || 1;
                  return (
                    <article className="sw-cart-row" key={p.id} data-reveal="up">
                      <Link href={`/products/${p.id}`} className="sw-cart-img" tabIndex={-1}>
                        <img
                          src={current?.image ?? p.image}
                          alt={p.name}
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_IMAGE;
                          }}
                        />
                      </Link>
                      <div className="sw-cart-info">
                        <span className="sw-cart-cat">{p.category}</span>
                        <h3>
                          <Link href={`/products/${p.id}`}>{current?.name ?? p.name}</Link>
                        </h3>
                        <p>
                          {current?.weight ?? p.weight} · {money(current?.price ?? p.price)} per pack
                        </p>
                        {loaded && (!current || n > (current.stock ?? 0)) && (
                          <small className="sw-cart-warn">
                            {current ? `Only ${current.stock ?? 0} packs remain. Please reduce the quantity.` : 'This favorite is no longer available.'}
                          </small>
                        )}
                      </div>
                      <div className="sw-cart-actions">
                          <div className="sw-stepper is-small">
                            <button aria-label={`Decrease ${p.name}`} disabled={n <= 1} onClick={() => quantity(p.id, n - 1)}>
                              <Minus size={13} />
                            </button>
                            <input
                              aria-label={`Quantity for ${p.name}`}
                              type="number"
                              min={1}
                              max={max}
                              value={n}
                              onChange={(e) => quantity(p.id, Number(e.target.value))}
                            />
                            <button aria-label={`Increase ${p.name}`} disabled={n >= max} onClick={() => quantity(p.id, n + 1)}>
                              <Plus size={13} />
                            </button>
                          </div>
                          <strong className="sw-cart-total">{money((current?.price ?? p.price) * n)}</strong>
                      </div>
                      <button className="sw-cart-remove" aria-label={`Remove ${p.name} from cart`} title="Remove" onClick={() => remove(p.id)}>
                        <Trash2 size={15} />
                      </button>
                    </article>
                  );
                })}
              </div>

              <div className="sw-cart-note">
                <Truck size={22} />
                <p>Prepared in fresh batches with 6–7 days lead time. Bangalore delivery: 24 hrs after dispatch. Outside Bangalore: 4–10 days.</p>
              </div>
            </div>

            <aside className="sw-checkout">
              <span className="sw-kicker">
                <LockKeyhole size={12} /> Checkout
              </span>
              <h2>
                Ready for <em>some goodness?</em>
              </h2>

              <div className="sw-summary">
                <div>
                  <span>Products ({packs} packs)</span>
                  <strong>{money(subtotal)}</strong>
                </div>
                {appliedCoupon && (
                  <div className="is-discount">
                    <span className="sw-coupon-tag">
                      <Tag size={13} /> {appliedCoupon.code}
                      <button type="button" onClick={removeCoupon} aria-label="Remove coupon">
                        <X size={12} />
                      </button>
                    </span>
                    <strong>- {money(appliedCoupon.discount_amount)}</strong>
                  </div>
                )}
                <div className="is-total">
                  <span>To pay (COD)</span>
                  <strong>{money(finalTotal)}</strong>
                </div>
              </div>

              <form className="sw-coupon" onSubmit={applyCoupon}>
                <div className="sw-coupon-row">
                  <input
                    type="text"
                    aria-label="Coupon code"
                    placeholder="Coupon code"
                    value={couponCode}
                    disabled={!!appliedCoupon || couponBusy}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  />
                  {appliedCoupon ? (
                    <button type="button" onClick={removeCoupon}>
                      Remove
                    </button>
                  ) : (
                    <button type="submit" disabled={couponBusy || !couponCode.trim()}>
                      {couponBusy ? 'Applying…' : 'Apply'}
                    </button>
                  )}
                </div>
                {couponSuccess && <p className="sw-alert is-success">{couponSuccess}</p>}
                {couponError && <p className="sw-alert is-error">{couponError}</p>}
              </form>

              <p className="sw-checkout-pay">
                <b>Cash on delivery</b> · No online payment is taken. Any additional delivery charges are confirmed separately by the kitchen.
              </p>

              {!user ? (
                <div className="sw-checkout-login">
                  <p>Sign in to securely place your order and keep track of every homemade moment.</p>
                  <button className="sw-btn is-red is-block" onClick={() => openLogin('/cart')}>
                    <span>Login / Register to continue</span>
                    <ArrowUpRight size={17} />
                  </button>
                </div>
              ) : (
                <form className="sw-form" onSubmit={place}>
                  <label className="sw-field">
                    <span>Your name</span>
                    <div className="sw-input">
                      <input required maxLength={100} value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} />
                    </div>
                  </label>
                  <label className="sw-field">
                    <span>Mobile number</span>
                    <div className="sw-input">
                      <input
                        required
                        type="tel"
                        pattern="[6-9][0-9]{9}"
                        title="10-digit Indian mobile number, without +91"
                        placeholder="10-digit mobile number"
                        autoComplete="tel-national"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </label>
                  <label className="sw-field">
                    <span>Address</span>
                    <div className="sw-input">
                      <textarea
                        required
                        minLength={10}
                        maxLength={1000}
                        rows={3}
                        autoComplete="street-address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>
                  </label>
                  <div className="sw-form-row">
                    <label className="sw-field">
                      <span>City</span>
                      <div className="sw-input">
                        <input required maxLength={30} autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} />
                      </div>
                    </label>
                    <label className="sw-field">
                      <span>State</span>
                      <div className="sw-input">
                        <input required maxLength={60} autoComplete="address-level1" value={state} onChange={(e) => setState(e.target.value)} />
                      </div>
                    </label>
                  </div>
                  <div className="sw-form-row">
                    <label className="sw-field">
                      <span>Pincode</span>
                      <div className="sw-input">
                        <input required inputMode="numeric" pattern="[1-9][0-9]{5}" autoComplete="postal-code" value={pin} onChange={(e) => setPin(e.target.value)} />
                      </div>
                    </label>
                    <label className="sw-field">
                      <span>Dispatch date</span>
                      <div className="sw-input">
                        <input type="date" required min={earliest()} value={date} onChange={(e) => setDate(e.target.value)} />
                      </div>
                    </label>
                  </div>
                  <button className="sw-btn is-red is-block is-large" disabled={busy || invalid || !checkoutKey}>
                    <span>{busy ? 'Placing your order…' : 'Place order'}</span>
                    <Check size={17} />
                  </button>
                </form>
              )}
              <ul className="sw-checkout-trust">
                <li>
                  <Leaf size={15} /> Natural ingredients, no preservatives
                </li>
                <li>
                  <CalendarDays size={15} /> Freshly made for your order
                </li>
                <li>
                  <ShieldCheck size={15} /> Pay in cash when it arrives
                </li>
              </ul>
            </aside>
          </div>
        )}
        {ready && loaded && suggestionRow}
      </section>
    </>
  );
}
