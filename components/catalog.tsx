'use client';
import {PickupText} from '@/components/pickup-date';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Search, X, Leaf, CalendarDays } from 'lucide-react';
import { Product } from '@/lib/products';
import { Category, getCategoryImage } from '@/lib/admin';
import { loadMenu } from '@/lib/storefront';
import { ProductCarousel } from './product-carousel';
import { ProductCard } from './product-card';

const ALL = 'All favorites';

export function Catalog({featured=false}:{featured?:boolean}) {return <Suspense fallback={<p>Loading kitchen…</p>}><CatalogContent featured={featured}/></Suspense>}
function CatalogContent({ featured = false }: { featured?: boolean }) {
  const searchParams=useSearchParams();
  const selectedCategory=searchParams.get("category")||ALL;
  useEffect(()=>{setCategory(selectedCategory);setQuery('')},[selectedCategory]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState(ALL);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const pills = useRef<HTMLDivElement>(null);
  const tiles = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selected = new URLSearchParams(window.location.search).get('category');
    if (selected) setCategory(selected);
    let disposed = false;
    loadMenu()
      .then((data) => {
        if (!disposed) {
          setProducts(data.products);
          setCategories(data.categories);
        }
      })
      .catch((e) => {
        if (!disposed) setError(e.message);
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, []);

  // Keep the selected filter in view (works for pills on home, tiles on products page).
  useLayoutEffect(() => {
    const wrap = featured ? pills.current : tiles.current;
    const el = wrap?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!wrap || !el) return;
    wrap.scrollTo({ left: el.offsetLeft - 16, behavior: 'smooth' });
  }, [category, categories, featured]);

  const names = [ALL, ...categories.map((c) => c.name)];
  const filtered = products.filter(
    (p) => (category === ALL || p.category === category) && p.name.toLowerCase().includes(query.toLowerCase())
  );
  const shown = featured
    ? [...filtered].sort((a, b) => Number(b.image.startsWith('/images/products/')) - Number(a.image.startsWith('/images/products/')))
    : filtered;

  return (
    <div className="sw-catalog">
      {/* PRODUCTS PAGE: one filter only = the category tiles on top */}
      {!featured && categories.length > 0 && (
        <div className="sw-cat-showcase" ref={tiles} role="group" aria-label="Browse categories">
{[{ id: 'all', name: ALL, image: '/images/hero.webp' } as Category, ...categories].map((c) => (
  <button
    key={c.id}
    type="button"
    aria-pressed={category === c.name}
    className={`sw-cat-tile ${category === c.name ? 'is-active' : ''}`}
    onClick={() => setCategory(c.name)}
  >
    <span className="sw-cat-tile-img">
      <img src={c.name === ALL ? '/images/hero.webp' : getCategoryImage(c)} alt="" />
    </span>
    <span className="sw-cat-tile-name">{c.name}</span>
  </button>
))}
        </div>
      )}

      {/* HOME PAGE (featured): pills only. PRODUCTS PAGE: search only. */}
      <div className={`sw-catalog-tools ${featured ? 'is-featured' : 'shop-search-row'}`}>
        {!featured&&<div className="sw-shop-notes"><span><Leaf size={15}/> Small batches. Real ingredients.</span><span><CalendarDays size={15}/> <PickupText text="Prebook now for Diwali · Pickup 7 November · Bangalore only"/></span></div>}
        {featured && (
          <div className="sw-filter" ref={pills} role="group" aria-label="Filter by category">
            {names.map((c) => (
              <button
                key={c}
                type="button"
                className={c === category ? 'is-on' : ''}
                aria-pressed={c === category}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        {!featured && (
          <label className="sw-search">
            <Search size={16} />
            <input aria-label="Search kitchen products" placeholder="Find your favorite…" value={query} onChange={(e) => setQuery(e.target.value)} />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery('')}>
                <X size={14} />
              </button>
            )}
          </label>
        )}
      </div>

      {error && (
        <p className="sw-alert is-error" role="alert">
          {error}
        </p>
      )}

      {/* No data-stagger here: re-mounted items would never get revealed and would vanish */}
      {featured && !loading ? <ProductCarousel key={category}>{shown.map(p=><ProductCard key={p.id} product={p}/>)}</ProductCarousel> : (
      <div className="sw-grid" key={`${category}-${loading}`}>
        {loading
          ? Array.from({ length: 4 }, (_, i) => (
              <div className="sw-card-skeleton" key={i} aria-hidden="true">
                <span />
                <i />
                <i />
              </div>
            ))
          : shown.map((p) => <ProductCard product={p} key={p.id} />)}
      </div>      )}


      {!loading && !shown.length && !error && (
        <div className="sw-empty">
          <h3>No favorites here yet.</h3>
          <p>Check back soon, or ask our kitchen what&apos;s cooking.</p>
        </div>
      )}
    </div>
  );
}
