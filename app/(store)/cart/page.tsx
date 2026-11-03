'use client';
import {PickupDetails} from '@/components/pickup-details';
import {PaymentInstructions} from '@/components/payment-instructions';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {PaymentProof, proofFileError, uploadPaymentProof} from '@/components/payment-proof';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowUpRight, CalendarDays, Check, ImageUp, Leaf, LoaderCircle, LocateFixed, LockKeyhole, Minus, Plus, ShieldCheck, ShoppingBag, Tag, Trash2, Truck, X } from 'lucide-react';
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
  if (new Date() <= new Date('2026-11-07T23:59:59+05:30')) return '2026-11-07';
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export default function Cart() {
  const isCheckout=usePathname()==='/checkout';
  const { openLogin } = useAuthUI();
  const { cart, quantity, remove, clear, ready } = useCommerce();
  const [menu, setMenu] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState('');
  const [proofError, setProofError] = useState('');
  const [proofSent, setProofSent] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [checked, setChecked] = useState(false);
  const [formError, setFormError] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pin, setPin] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
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
      // Pre-fill the registered mobile number as 10 digits (drops +91 / leading 0).
      const registered = String(user?.user_metadata?.phone || user?.phone || '').replace(/\D/g, '').slice(-10);
      if (/^[6-9][0-9]{9}$/.test(registered)) setPhone((current) => current || registered);
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

  // Fill the address from the device's live location (OpenStreetMap reverse geocoding).
  function fillFromLocation() {
    if (locating) return;
    if (!navigator.geolocation) {
      setLocationError('Location is not supported on this device. Please type your address.');
      return;
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=en&lat=${coords.latitude}&lon=${coords.longitude}`,
          );
          if (!res.ok) throw new Error();
          const data: { display_name?: string; address?: Record<string, string> } = await res.json();
          const a = data.address ?? {};
          const street = [a.house_number, a.building, a.road, a.neighbourhood, a.suburb, a.city_district].filter(Boolean).join(', ');
          setAddress(street.length >= 10 ? street : data.display_name ?? street);
          setCity((a.city || a.town || a.village || a.county || a.state_district || '').slice(0, 30));
          setState((a.state || '').slice(0, 60));
          const code = (a.postcode || '').replace(/\s/g, '');
          if (/^[1-9][0-9]{5}$/.test(code)) setPin(code);
        } catch {
          setLocationError('Could not find your address. Please type it in.');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied. Please allow it in your browser or type your address.'
            : 'Could not get your location. Please type your address.',
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  async function place(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !user || busy) return;
    setBusy(true);
    setError('');
    try {
      if (!/^[6-9][0-9]{9}$/.test(altPhone.trim())) throw new Error('Enter a valid 10-digit alternative mobile number.');
      if (!/^(bangalore|bengaluru)$/i.test(city.trim())) throw new Error('This Diwali, orders are available within Bangalore only.');
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
        p_date: earliest(),
        p_items: cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        p_checkout_key: checkoutKey,
        p_coupon_code: appliedCoupon ? appliedCoupon.code : null,
        p_alt_phone: altPhone || null,
      };

      let res = await supabase.rpc('place_order', payload);
      // Fallback if place_order does not yet take p_alt_phone (011 not run): keep the number in the address
      if (res.error?.message?.includes('place_order')) {
        delete payload.p_alt_phone;
        if (altPhone) payload.p_address = `${address}\nAlternative phone: ${altPhone}`;
        res = await supabase.rpc('place_order', payload);
      }
      // Fallback if place_order does not yet take p_coupon_code
      if (res.error && res.error.message && res.error.message.includes('place_order')) {
        delete payload.p_coupon_code;
        res = await supabase.rpc('place_order', payload);
      }

      if (res.error) throw res.error;
      const orderId = String(res.data);
      if (proofFile) {
        try {
          await uploadPaymentProof(orderId, proofFile);
          setProofSent(true);
        } catch {
          setProofSent(false);
        }
      }
      setSuccess(orderId);
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
          {proofSent
            ? 'Your payment screenshot was received. The kitchen will verify it and confirm preparation and delivery.'
            : 'We could not upload your payment screenshot. Please upload it again below so the kitchen can verify your payment.'}
        </p>
        <PickupDetails orderId={success} autoOpen/>
        {!proofSent && <PaymentProof orderId={success} />}
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
              {isCheckout ? (
                <div className="sw-checkout-details">
                  <div className="sw-cart-list-head">
                    <h2>
                      Delivery <em>details</em>
                    </h2>
                    <div className="sw-details-actions">
                      {user && (
                        <button type="button" className="sw-locate" onClick={fillFromLocation} disabled={locating}>
                          {locating ? <LoaderCircle size={15} className="is-spinning" /> : <LocateFixed size={15} />}
                          <span>{locating ? 'Locating…' : 'Use my location'}</span>
                        </button>
                      )}
                      <Link className="sw-link" href="/cart">
                        Edit bag <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  </div>
                  {!user ? (
                <div className="sw-checkout-login">
                  <p>Sign in to securely place your order and keep track of every homemade moment.</p>
                  <button className="sw-btn is-red is-block" onClick={() => openLogin('/checkout')}>
                    <span>Login / Register to continue</span>
                    <ArrowUpRight size={17} />
                  </button>
                </div>
              ) : (
                <form
                  id="sw-checkout-form"
                  className={'sw-form' + (checked ? ' is-checked' : '')}
                  onSubmit={place}
                  onInput={() => setFormError('')}
                >
                  {formError && (
                    <p className="sw-alert is-error" role="alert">
                      {formError}
                    </p>
                  )}
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
                    <span>
                      Alternative mobile number <small>(required)</small>
                    </span>
                    <div className="sw-input">
                      <input
                        type="tel"
                        pattern="[6-9][0-9]{9}"
                        title="10-digit Indian mobile number, without +91"
                        required
                        placeholder="Another number we can reach"
                        autoComplete="off"
                        value={altPhone}
                        onChange={(e) => setAltPhone(e.target.value)}
                      />
                    </div>
                  </label>
                  {locationError && (
                    <p className="sw-alert is-error" role="alert">
                      {locationError}
                    </p>
                  )}
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
                  <label className="sw-field">
                    <span>Pincode</span>
                    <div className="sw-input">
                      <input required inputMode="numeric" pattern="[1-9][0-9]{5}" autoComplete="postal-code" value={pin} onChange={(e) => setPin(e.target.value)} />
                    </div>
                  </label>
                </form>
                  )}
                </div>
              ) : (
              <>
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
              </>
              )}

              <div className="sw-cart-note">
                <Truck size={22} />
                <p>Prebook now for Diwali. Pickup date: 7 November. Delivery within Bangalore only until 7 November. Porter/Dunzo (charges self-pay).</p>
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
                <div className="is-shipping">
                  <span>
                    <Truck size={14} /> Shipping charges
                  </span>
                  <strong>Self pay (Book it yourself for this Diwali)</strong>
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
                  <span>Total to pay</span>
                  <strong>{money(finalTotal)}</strong>
                </div>
              </div>
              <p className="sw-shipping-note">Address and order number will be shared after order is confirmed.</p>

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

              {isCheckout && (
                <PaymentInstructions checkout>
                  {user && (
                    <label className={'sw-proof-upload' + (checked && !proofFile ? ' is-missing' : '')}>
                      {proofPreview ? <img src={proofPreview} alt="Payment screenshot preview" /> : <ImageUp size={22} />}
                      <span>
                        <b>{proofFile ? 'Screenshot added — tap to change' : 'Upload payment screenshot *'}</b>
                        <small>{proofFile ? proofFile.name : 'JPG, PNG or WebP, up to 5 MB'}</small>
                      </span>
                      <input
                        type="file"
                        form="sw-checkout-form"
                        required
                        accept="image/png,image/jpeg,image/webp"
                        aria-label="Payment screenshot"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          const invalid = file ? proofFileError(file) : '';
                          setProofError(invalid);
                          if (invalid) e.target.value = '';
                          const next = invalid ? null : file;
                          setProofFile(next);
                          setProofPreview((old) => {
                            if (old) URL.revokeObjectURL(old);
                            return next ? URL.createObjectURL(next) : '';
                          });
                        }}
                      />
                    </label>
                  )}
                  {proofError && (
                    <p className="sw-alert is-error" role="alert">
                      {proofError}
                    </p>
                  )}
                </PaymentInstructions>
              )}

              {!isCheckout ? <button type="button" className="sw-btn is-red is-block" onClick={() => openLogin('/checkout')}><span>Continue to checkout</span><ArrowUpRight size={17}/></button> : user && (
                <button
                  form="sw-checkout-form"
                  className="sw-btn is-red is-block is-large"
                  disabled={busy || invalid || !checkoutKey}
                  onClick={() => {
                    // Highlight every empty or wrong field; the browser then focuses the first one.
                    const form = document.getElementById('sw-checkout-form') as HTMLFormElement | null;
                    if (form && !form.checkValidity()) {
                      setChecked(true);
                      setFormError('Please fill in all the required delivery details and upload your payment screenshot.');
                    }
                  }}
                >
                  <span>{busy ? 'Placing your order…' : 'Place order'}</span>
                  <Check size={17} />
                </button>
              )}
              <ul className="sw-checkout-trust">
                <li>
                  <Leaf size={15} /> Natural ingredients, no preservatives
                </li>
                <li>
                  <CalendarDays size={15} /> Freshly made for your order
                </li>
                <li>
                  <ShieldCheck size={15} /> Secure UPI / QR payment
                </li>
              </ul>
            </aside>
          </div>
        )}
        {!isCheckout && ready && loaded && suggestionRow}
      </section>
    </>
  );
}
