'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, Share2, Heart, Leaf, Minus, Package, Plus, ShieldCheck, ShoppingBag, Truck, X, ZoomIn } from 'lucide-react';
import { loadMenu } from '@/lib/storefront';
import { Product } from '@/lib/products';
import { money } from '@/lib/admin';
import { useCommerce } from './commerce';
import { FALLBACK_IMAGE, ProductCard } from './product-card';
import { Lines, Ornament } from './motion';

export function ProductDetail({ id }: { id: string }) {
  const [product, setProduct] = useState<Product | null>(null),
    [related, setRelated] = useState<Product[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [qty, setQty] = useState(1),
    [added, setAdded] = useState(false),
    [zoom, setZoom] = useState(false),
    [broken, setBroken] = useState(false);
  const [shareNotice,setShareNotice] = useState('');
  async function shareProduct(){const url=window.location.href;try{if(navigator.share){await navigator.share({title:product?.name,text:product?.description,url});setShareNotice('')}else{await navigator.clipboard.writeText(url);setShareNotice('Product link copied.')}}catch(e){if((e as Error).name!=='AbortError')setShareNotice('Unable to share. Copy the page link from your browser.')}}
  const { add, toggleWish, wishlist } = useCommerce();

  useEffect(() => {
    let disposed = false;
    setLoading(true);
    setError('');
    setAdded(false);
    setZoom(false);
    setBroken(false);
    loadMenu()
      .then((data) => {
        if (!disposed) {
          const p = data.products.find((p) => p.id === id);
          setProduct(p ?? null);
          setRelated(
            data.products
              .filter((x) => x.id !== id)
              .sort((a, b) => Number(b.category === p?.category) - Number(a.category === p?.category))
              .slice(0, 5)
          );
          setQty(1);
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
  }, [id]);

  useEffect(() => {
    if (!zoom) return;
    const opener = document.activeElement as HTMLElement | null;
    function close(e: KeyboardEvent) {
      if (e.key === 'Escape') setZoom(false);
      if (e.key === 'Tab') {
        e.preventDefault();
        document.querySelector<HTMLButtonElement>('.sw-zoom>button')?.focus();
      }
    }
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('keydown', close);
      opener?.focus();
    };
  }, [zoom]);

  if (loading)
    return (
      <section className="sw-section sw-pd-loading" aria-busy="true">
        <div className="sw-pd-skeleton">
          <span />
          <div>
            <i />
            <i />
            <i />
          </div>
        </div>
      </section>
    );
  if (error)
    return (
      <section className="sw-section sw-empty">
        <p className="sw-alert is-error" role="alert">
          {error}
        </p>
        <Link className="sw-btn is-red" href="/products">
          <span>Back to the kitchen</span>
        </Link>
      </section>
    );
  if (!product)
    return (
      <section className="sw-section sw-empty">
        <h1>This favorite isn&apos;t on the menu.</h1>
        <Link className="sw-btn is-red" href="/products">
          <span>Explore our kitchen</span>
        </Link>
      </section>
    );

  const p = product,
    image = broken ? FALLBACK_IMAGE : p.image,
    wished = wishlist.some((w) => w.id === id),
    stock = p.stock ?? 0,
    max = Math.min(stock, 100),
    valid = Number.isInteger(qty) && qty >= 1 && qty <= max;

  function addToBag() {
    if (!valid) return;
    add(p, qty);
    setAdded(true);
  }

  return (
    <div className="sw-pd">
      <section className="sw-pd-main">
        <nav className="sw-crumbs" aria-label="Breadcrumb">
          <Link href="/products">
            <ArrowLeft size={13} /> Our kitchen
          </Link>
          <span>/</span>
          <Link href={`/products?category=${encodeURIComponent(p.category)}`}>{p.category}</Link>
          <span>/</span>
          <span aria-current="page">{p.name}</span>
        </nav>
        <div className="sw-pd-grid">
          <div className="sw-pd-gallery" data-reveal="scale">
            <button className="sw-pd-photo" aria-label={`Enlarge ${p.name} photo`} onClick={() => setZoom(true)}>
              <img src={image} alt={p.name} fetchPriority="high" onError={() => setBroken(true)} />
              <span className="sw-pd-zoomhint">
                <ZoomIn size={15} /> Take a closer look
              </span>
            </button>
            <span className="sw-pd-badge">
              <Leaf size={13} /> Homemade with care
            </span>
          </div>

          <div className="sw-pd-copy">
            <span className="sw-kicker" data-reveal="fade">
              {p.category} · Homemade
            </span>
            <Lines as="h1" lines={[p.name]} />
            <p className="sw-pd-summary" data-reveal="up">
              {p.description}
            </p>
            <div className="sw-pd-price" data-reveal="up">
              <div>
                <strong>{money(p.price)}</strong>
                <span>per {p.weight} pack</span>
              </div>
              <span className={`sw-pd-stock ${stock ? '' : 'is-out'}`}>
                <i />
                {stock ? `${stock} packs available` : 'Fresh batches coming soon'}
              </span>
            </div>

            <div className="sw-pd-buy" data-reveal="up">
              <div className="sw-pd-pack">
                <span>Pack</span>
                <b>
                  <Package size={16} /> {p.weight} <Check size={14} />
                </b>
              </div>
              <div className="sw-pd-row">
                <div className="sw-stepper">
                  <button
                    aria-label="Decrease quantity"
                    disabled={qty <= 1}
                    onClick={() => {
                      setQty((q) => Math.max(1, q - 1));
                      setAdded(false);
                    }}
                  >
                    <Minus size={15} />
                  </button>
                  <input
                    aria-label="Product quantity"
                    type="number"
                    min={1}
                    max={max || 1}
                    value={qty}
                    onChange={(e) => {
                      setQty(Number(e.target.value));
                      setAdded(false);
                    }}
                  />
                  <button
                    aria-label="Increase quantity"
                    disabled={!stock || qty >= max}
                    onClick={() => {
                      setQty((q) => Math.min(max, q + 1));
                      setAdded(false);
                    }}
                  >
                    <Plus size={15} />
                  </button>
                </div>
                <button
                  className={`sw-pd-wish ${wished ? 'is-saved' : ''}`}
                  aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
                  aria-pressed={wished}
                  onClick={() => toggleWish(p)}
                >
                  <Heart size={19} fill={wished ? 'currentColor' : 'none'} />
                </button>
                <button type="button" className="sw-pd-share-button" onClick={shareProduct} aria-label="Share this product" title="Share product"><Share2 size={19}/></button>
              </div>
              {shareNotice && <span className="sw-share-notice" role="status">{shareNotice}</span>}
              <button className={`sw-btn is-red is-block is-large ${added ? 'is-done' : ''}`} disabled={!valid} onClick={addToBag}>
                {added ? <Check size={18} /> : <ShoppingBag size={18} />}
                <span>{stock ? (added ? 'Added to your bag' : 'Add to bag') : 'Currently sold out'}</span>
                {valid && <b className="sw-btn-price">{money(p.price * qty)}</b>}
              </button>
              <div className="sw-pd-status">
                <span role="status" aria-live="polite">
                  {added ? `${qty} ${qty === 1 ? 'pack' : 'packs'} added. Ready when you are.` : 'Made in small batches. Worth the little wait.'}
                </span>
                <Link className="sw-link" href="/cart">
                  View bag <ArrowUpRight size={13} />
                </Link>
              </div>
            </div>

            <div className="sw-pd-delivery" data-reveal="up">
              <div>
                <CalendarDays size={20} />
                <span>
                  <b>Freshly made for you</b>Prebook now for Diwali. Pickup date: 7 November. Delivery within Bangalore only until 7 November. Porter/Dunzo (charges self-pay).
                </span>
              </div>
              <div>
                <Truck size={20} />
                <span>
                  <b>From our kitchen to your door</b>Delivery within Bangalore only until 7 November. Porter/Dunzo (charges self-pay).
                </span>
              </div>
            </div>
            <div className="sw-pd-trust">
              <span>
                <Leaf size={14} /> Natural ingredients
              </span>
              <span>
                <ShieldCheck size={14} /> Thoughtfully prepared
              </span>
              <span>
                <Heart size={14} /> Made with love
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="sw-pd-info">
        <div className="sw-pd-info-copy">
          <Ornament />
          <span className="sw-kicker is-light" data-reveal="fade">
            Good food is in the details
          </span>
          <Lines lines={['Every little detail.', <em key="e">Every bit of care.</em>]} />
          <p data-reveal="up">{p.long_description || p.description}</p>
        </div>
        <div className="sw-accordions" data-stagger>
          {[
            ['Ingredients & allergens', `${p.ingredients || 'Please confirm the ingredients with our kitchen before ordering.'}\n${p.allergens || 'For allergies or dietary requirements, contact our kitchen before placing an order.'}`],
            ['Shelf life & storage', `${p.shelf_life || 'Shelf life: please confirm with our kitchen.'}\n${p.storage || 'Storage instructions: please follow the guidance on your pack or check with our kitchen.'}`],
            ['Pack & product details', `Pack size: ${p.weight}\nProduct code: ${p.sku || p.id}`],
            ['Preparation & delivery', 'Prebook now for Diwali. Pickup date: 7 November. Delivery within Bangalore only until 7 November. Porter/Dunzo (charges self-pay).'],
          ].map(([title, body], i) => (
            <details key={title} open={i === 0} data-reveal="up">
              <summary>
                {title}
                <Plus size={16} />
              </summary>
              <div>
                <p>{body}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="sw-section sw-related">
          <div className="sw-head is-split">
            <div>
              <span className="sw-kicker" data-reveal="fade">
                A little more homemade
              </span>
              <Lines lines={[<>You might also <em>love.</em></>]} />
            </div>
            <Link className="sw-link" href="/products" data-reveal="up">
              Explore the kitchen <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="sw-grid" data-stagger>
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}

      {zoom && (
        <div className="sw-zoom" role="dialog" aria-modal="true" aria-label={`${p.name} enlarged photo`} onClick={() => setZoom(false)}>
          <button autoFocus aria-label="Close enlarged photo" onClick={() => setZoom(false)}>
            <X size={23} />
          </button>
          <img src={image} alt={`${p.name} enlarged`} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
