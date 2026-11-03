'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, CornerDownLeft, Leaf, MessageCircle, Plus, Search, Sparkles, X } from 'lucide-react';
import { Category, getCategoryImage } from '@/lib/admin';
import { Product } from '@/lib/products';
import { loadMenu } from '@/lib/storefront';
import { useCommerce } from './commerce';
import { FALLBACK_IMAGE } from './product-card';

// Pages people often look for, matched by these words too.
const pages = [
  { label: 'Our kitchen', href: '/products', words: 'shop menu all products kitchen buy' },
  { label: 'Our story', href: '/our-story', words: 'about family story who we are' },
  { label: 'Contact us', href: '/contact', words: 'contact phone call bulk order wedding festival help' },
  { label: 'My bag', href: '/cart', words: 'cart bag checkout order' },
  { label: 'My wishlist', href: '/wishlist', words: 'wishlist saved favourites favorites heart' },
  { label: 'My account', href: '/account', words: 'account profile orders invoice login sign in track' },
];

const suggestionsWords = ['Laddoo', 'Chakli', 'Sambar', 'Pickle'];

type Result = { kind: 'product'; product: Product } | { kind: 'page'; label: string; href: string };

/** Site-wide search popup: products, categories and pages, with keyboard navigation. */
export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { add } = useCommerce();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Load the menu the first time the popup opens.
  useEffect(() => {
    if (!open || products) return;
    loadMenu()
      .then((d) => {
        setProducts(d.products);
        setCategories(d.categories);
      })
      .catch(() => setProducts([]));
  }, [open, products]);

  // Focus the box, lock page scroll, and return focus to the button on close.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setQuery('');
    setActive(0);
    requestAnimationFrame(() => input.current?.focus());
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  const term = query.trim().toLowerCase();
  const results: Result[] = useMemo(() => {
    if (!term) return [];
    const words = term.split(/\s+/);
    const score = (text: string) => (words.every((w) => text.includes(w)) ? (text.startsWith(words[0]) ? 2 : 1) : 0);
    const found = (products ?? [])
      .map((p) => ({ p, s: score(`${p.name} ${p.category} ${p.description}`.toLowerCase()) * 2 + (p.name.toLowerCase().startsWith(words[0]) ? 1 : 0) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 6)
      .map(({ p }): Result => ({ kind: 'product', product: p }));
    const pageHits = pages
      .filter((pg) => score(`${pg.label} ${pg.words}`.toLowerCase()))
      .slice(0, 3)
      .map((pg): Result => ({ kind: 'page', label: pg.label, href: pg.href }));
    return [...found, ...pageHits];
  }, [term, products]);

  useEffect(() => setActive(0), [term]);

  // Keep the highlighted result in view while moving with the arrow keys.
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function go(r: Result) {
    onClose();
    router.push(r.kind === 'product' ? `/products/${encodeURIComponent(r.product.id)}` : r.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown' && results.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp' && results.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === 'Tab') {
      // Keep keyboard focus inside the popup.
      const nodes = [...(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,a[href]') ?? [])];
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }

  if (!open) return null;

  const productCount = results.filter((r) => r.kind === 'product').length;

  return (
    <div className="sw-search-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} className="sw-search-panel" role="dialog" aria-modal="true" aria-label="Search Swaadha" onKeyDown={onKeyDown}>
        <div className="sw-search-field">
          <Search size={20} />
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search laddoos, chakli, spices…"
            aria-label="Search products and pages"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="sw-search-results"
            aria-activedescendant={results.length ? `sw-search-${active}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button className="sw-search-clear" aria-label="Clear search" onClick={() => (setQuery(''), input.current?.focus())}>
              <X size={15} />
            </button>
          )}
          <button type="button" className="sw-search-esc" aria-label="Close search" onClick={onClose}><X size={18}/></button>
        </div>

        <div className="sw-search-body" ref={list}>
          {!term ? (
            <>
              <div className="sw-search-group">
                <span className="sw-search-label">
                  <Sparkles size={13} /> Popular searches
                </span>
                <div className="sw-search-chips">
                  {suggestionsWords.map((w) => (
                    <button key={w} onClick={() => (setQuery(w), input.current?.focus())}>
                      <Search size={13} /> {w}
                    </button>
                  ))}
                </div>
              </div>
              {categories.length > 0 && (
                <div className="sw-search-group">
                  <span className="sw-search-label">
                    <Leaf size={13} /> Browse by craving
                  </span>
                  <div className="sw-search-cats">
                    {categories.map((c) => (
                      <Link key={c.id} href={`/products?category=${encodeURIComponent(c.name)}`} onClick={onClose}>
                        <img src={getCategoryImage(c)} alt="" />
                        <span>{c.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : products === null ? (
            <div className="sw-search-loading">
              {[0, 1, 2].map((i) => (
                <span key={i} />
              ))}
            </div>
          ) : !results.length ? (
            <div className="sw-search-empty">
              <span>
                <Search size={24} />
              </span>
              <b>Nothing found for “{query.trim()}”.</b>
              <p>Try another word, or ask our kitchen. We’re happy to help.</p>
              <Link className="sw-link" href="/contact">Contact our kitchen</Link>
            </div>
          ) : (
            <div id="sw-search-results" role="listbox" aria-label="Search results">
              {productCount > 0 && <span className="sw-search-label">Products</span>}
              {results.map((r, i) =>
                r.kind === 'product' ? (
                  <div
                    key={r.product.id}
                    id={`sw-search-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={i === active}
                    className={`sw-search-item ${i === active ? 'is-active' : ''}`}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r)}
                  >
                    <img
                      src={r.product.image || FALLBACK_IMAGE}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_IMAGE;
                      }}
                    />
                    <span className="sw-search-item-text">
                      <b>{r.product.name}</b>
                      <small>
                        {r.product.category} · {r.product.weight}
                      </small>
                    </span>
                    <strong>₹{r.product.price}</strong>
                    <button
                      className="sw-search-add"
                      aria-label={`Add ${r.product.name} to bag`}
                      title="Add to bag"
                      disabled={(r.product.stock ?? 0) < 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        add(r.product);
                      }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                ) : (
                  <div key={r.href} className="sw-search-pagewrap">
                    {i === productCount && <span className="sw-search-label">Pages</span>}
                    <div
                      id={`sw-search-${i}`}
                      data-index={i}
                      role="option"
                      aria-selected={i === active}
                      className={`sw-search-item is-page ${i === active ? 'is-active' : ''}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(r)}
                    >
                      <span className="sw-search-page-icon">
                        <ArrowUpRight size={16} />
                      </span>
                      <span className="sw-search-item-text">
                        <b>{r.label}</b>
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <footer className="sw-search-foot">
          <Link href="/products" onClick={onClose}>
            Browse the whole kitchen <ArrowUpRight size={13} />
          </Link>
        </footer>
      </div>
    </div>
  );
}
