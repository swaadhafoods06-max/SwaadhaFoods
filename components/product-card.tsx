'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight, Heart, ShoppingCart } from 'lucide-react';
import { Product } from '@/lib/products';
import { useCommerce } from './commerce';

export const FALLBACK_IMAGE = '/images/hero.webp';

export function ProductCard({ product: p }: { product: Product }) {
  const { add, toggleWish, wishlist } = useCommerce();
  const [src, setSrc] = useState(p.image || FALLBACK_IMAGE);
  const wished = wishlist.some((w) => w.id === p.id);
  const stock = p.stock ?? 0;
  const href = `/products/${encodeURIComponent(p.id)}`;

  return (
    <article className="sw-card" data-reveal="up">
      <div className="sw-card-inner" data-tilt>
        <div className="sw-card-media">
          <Link href={href} aria-label={`View ${p.name} details`} tabIndex={-1}>
            <img src={src} alt={p.name} loading="lazy" onError={() => setSrc(FALLBACK_IMAGE)} />
          </Link>
          <span className="sw-card-chip">{p.category}</span>
          <button
            className={`sw-card-wish ${wished ? 'is-saved' : ''}`}
            aria-label={`${wished ? 'Remove' : 'Save'} ${p.name} ${wished ? 'from' : 'to'} wishlist`}
            aria-pressed={wished}
            onClick={() => toggleWish(p)}
          >
            <Heart size={17} fill={wished ? 'currentColor' : 'none'} />
          </button>
          <button className="sw-card-add sw-card-cart-icon" aria-label={stock > 0 ? `Add ${p.name} to cart` : `${p.name} sold out`} title={stock > 0 ? "Add to cart" : "Sold out"} disabled={stock < 1} onClick={() => add(p)}>
            <ShoppingCart size={17} />
          </button>
          <span className="sw-card-glare" aria-hidden="true" />
        </div>
        <div className="sw-card-body">
          <div className="sw-card-meta">
            <span>{p.weight}</span>
            <span className={stock > 0 ? 'is-in-stock' : 'is-out'}>
              <i />
              {stock > 0 ? (stock < 10 ? `Only ${stock} left` : 'In stock') : 'Sold out'}
            </span>
          </div>
          <h3>
            <Link href={href} title={p.name}>{p.name}</Link>
          </h3>
          <div className="sw-card-foot">
            <strong>₹{p.price}</strong>
            <Link href={href} className="sw-card-more">
              Details <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
