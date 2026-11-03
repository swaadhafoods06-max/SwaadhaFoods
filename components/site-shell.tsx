'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Heart, MessageCircle, Phone, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { useAuthUI } from './auth-dialog';
import { useCommerce } from './commerce';
import { SiteFooter } from './site-footer';
import { Marquee, MotionRoot } from './motion';
import { SearchDialog } from './search-dialog';

const links = [
  ['/', 'Home'],
  ['/products', 'Our kitchen'],
  ['/our-story', 'Our story'],
  ['/contact', 'Contact'],
] as const;

export function SiteShell({ children }: { children: React.ReactNode }) {
  const { user, ready: authReady, openLogin } = useAuthUI();
  const { cart, wishlist } = useCommerce();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcut, setShortcut] = useState('⌘K');
  useEffect(() => {
    if (!/Mac|iPhone|iPad/.test(navigator.platform)) setShortcut('Ctrl K');
  }, []);
  const progress = useRef<HTMLDivElement>(null);
  const count = cart.reduce((n, i) => n + i.quantity, 0);

  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
  }, [path]);

  // Ctrl/⌘ + K or "/" opens search from anywhere (but "/" not while typing in a field).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = (e.target as HTMLElement)?.closest?.('input, textarea, select, [contenteditable="true"]');
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(false);
        setSearchOpen((v) => !v);
      } else if (e.key === '/' && !typing) {
        e.preventDefault();
        setOpen(false);
        setSearchOpen(true);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // The intro curtain only belongs to the first page view.
  const firstPath = useRef(path);
  useEffect(() => {
    if (path !== firstPath.current) document.documentElement.classList.remove('intro');
  }, [path]);

  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.current?.style.setProperty('transform', `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`);
      setScrolled(y > 24);
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // The menu is only for small screens: close it if the window grows to desktop width
  // (e.g. going full screen), otherwise it would stay stuck over the page with no way to close it.
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1101px)');
    const close = () => desktop.matches && setOpen(false);
    desktop.addEventListener('change', close);
    return () => desktop.removeEventListener('change', close);
  }, []);

  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', close);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  // Every page opens on a dark crimson hero except product detail, which starts on ivory.
  const overlay = !path.startsWith('/products/') && !scrolled && !open;

  return (
    <>
      <MotionRoot />
      <div className="sw-intro" aria-hidden="true">
        <div className="sw-intro-panel is-red" />
        <div className="sw-intro-panel is-gold" />
        <div className="sw-intro-panel is-ivory">
          <div className="sw-intro-inner">
            <img src="/logo-transparent.png" alt="" />
            <span className="sw-intro-rule" />
            <p>Taste that feels like home</p>
          </div>
        </div>
      </div>

      <div className="sw-progress" ref={progress} aria-hidden="true" />

      <header
        className={`sw-header ${scrolled ? 'is-scrolled' : ''} ${overlay ? 'is-overlay' : ''}`}
      >
        <div className="sw-announce">
          <span>
            <Heart size={11} /> A little love from our kitchen to yours
          </span>
          <span className="sw-announce-mid">Prebook now for Diwali · Pickup 7 November · Bangalore only</span>
          
        </div>
        <div className="sw-header-bar">
          <Link className="sw-brand" href="/" aria-label="Swaadha home">
            <img src="/logo-transparent.png" alt="Swaadha — Taste That Feels Like Home" />
          </Link>
          <nav className="sw-nav" aria-label="Main navigation">
            {links.map(([href, label]) => {
              const active = href === '/' ? path === '/' : path.startsWith(href);
              return (
                <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={active ? 'is-active' : ''}>
                  <span className="sw-roll">
                    <span>{label}</span>
                    <span aria-hidden="true">{label}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="sw-actions">
            <button
              className="sw-search-trigger"
              aria-label="Search products"
              aria-keyshortcuts="Control+K Meta+K /"
              onClick={() => {
                setOpen(false);
                setSearchOpen(true);
              }}
            >
              <Search size={18} strokeWidth={1.8} />
              <span>Search</span>

            </button>
            <Link className="sw-icon-btn sw-wish-btn" href="/wishlist" aria-label={`Wishlist, ${wishlist.length} items`}>
              <Heart size={19} strokeWidth={1.7} />
              {wishlist.length > 0 && <b key={wishlist.length}>{wishlist.length}</b>}
            </Link>
            <Link className="sw-icon-btn" href="/cart" aria-label={`Cart, ${count} items`}>
              <ShoppingBag size={19} strokeWidth={1.7} />
              {count > 0 && <b key={count}>{count}</b>}
            </Link>
            {user ? (
              <Link className="sw-account" href="/account" aria-label="My account">
                <UserRound size={17} strokeWidth={1.8} />
                <span>Account</span>
              </Link>
            ) : (
              <button
                className="sw-account"
                disabled={!authReady}
                onClick={() => {
                  setOpen(false);
                  openLogin();
                }}
              >
                <UserRound size={17} strokeWidth={1.8} />
                <span>Sign in</span>
              </button>
            )}
            <button
              className="sw-burger"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="sw-menu"
              onClick={() => setOpen(!open)}
            >
              <i />
              <i />
            </button>
          </div>
        </div>
        <div className="sw-header-ticker"><Marquee items={['Honest ingredients','Lovingly homemade','Fresh small batches','No preservatives','Family recipes','Made in Bangalore','Delivered across India']}/></div>
      </header>

      <div className={`sw-menu-backdrop ${open ? 'is-open' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside
        id="sw-menu"
        className={`sw-menu ${open ? 'is-open' : ''}`}
        aria-label="Menu"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="sw-menu-top">
          <Link href="/" className="sw-menu-logo" onClick={() => setOpen(false)} aria-label="Swaadha home">
            <img src="/logo-transparent.png" alt="Swaadha" />
          </Link>
          <button className="sw-menu-close" aria-label="Close menu" onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="sw-menu-inner">
          <nav className="sw-menu-links" aria-label="Mobile navigation">
            {links.map(([href, label], i) => {
              const active = href === '/' ? path === '/' : path.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={active ? 'is-active' : ''}
                  aria-current={active ? 'page' : undefined}
                  style={{ '--i': i } as React.CSSProperties}
                  onClick={() => setOpen(false)}
                >
                  <span>{label}</span>
                  <ArrowUpRight size={17} />
                </Link>
              );
            })}
          </nav>

          <div className="sw-menu-quick" style={{ '--i': 4 } as React.CSSProperties}>
            {user ? (
              <Link href="/account" onClick={() => setOpen(false)}>
                <UserRound size={18} />
                <span>My account</span>
              </Link>
            ) : (
              <button
                disabled={!authReady}
                onClick={() => {
                  setOpen(false);
                  openLogin();
                }}
              >
                <UserRound size={18} />
                <span>Sign in</span>
              </button>
            )}
            <Link href="/wishlist" onClick={() => setOpen(false)}>
              <Heart size={18} />
              <span>Wishlist</span>
              {wishlist.length > 0 && <b>{wishlist.length}</b>}
            </Link>
            <Link href="/cart" onClick={() => setOpen(false)}>
              <ShoppingBag size={18} />
              <span>My bag</span>
              {count > 0 && <b>{count}</b>}
            </Link>
          </div>

          <div className="sw-menu-cats" style={{ '--i': 5 } as React.CSSProperties}>
            <span>Shop by craving</span>
            <div>
              {['Sweets', 'Snacks', 'Pantry', 'Pickles'].map((c) => (
                <Link key={c} href={`/products?category=${c}`} onClick={() => setOpen(false)}>
                  {c}
                </Link>
              ))}
            </div>
          </div>

          <div className="sw-menu-foot" style={{ '--i': 6 } as React.CSSProperties}>
            
            
          </div>
        </div>
      </aside>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <main id="main">{children}</main>
      <SiteFooter />
      
    </>
  );
}

