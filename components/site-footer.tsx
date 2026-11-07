'use client';
import {PickupText} from '@/components/pickup-date';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, Leaf, MessageCircle, Phone, Truck } from 'lucide-react';
import { useAuthUI } from './auth-dialog';
import { Lines, Ornament } from './motion';

export function SiteFooter() {
  const { user, openLogin } = useAuthUI();
  return (
    <footer className="sw-footer">
      <section className="sw-footer-cta">
        <Ornament />
        <Lines lines={['A little homemade.', <em key="e">A whole lot of heart.</em>]} />
        <div className="sw-footer-cta-actions" data-reveal="up">
          <Link className="sw-btn is-gold" href="/products" data-magnetic>
            <span>Explore our kitchen</span>
            <ArrowUpRight size={18} />
          </Link>
          
        </div>
      </section>

      <div className="sw-footer-grid" data-stagger>
        <div className="sw-footer-brand" data-reveal="up">
          <Link href="/" aria-label="Swaadha home">
            <img src="/logo-transparent.png" alt="Swaadha — Taste That Feels Like Home" />
          </Link>
          <p>Authentic flavors. Honest ingredients. Familiar recipes, lovingly made in our family kitchen in Bangalore.</p>
        </div>
        <div className="sw-footer-col" data-reveal="up">
          <h3>Visit</h3>
          <Link href="/">Home</Link>
          <Link href="/products">Our kitchen</Link>
          <Link href="/our-story">Our story</Link>
          <Link href="/contact">Contact us</Link>
          {user ? <Link href="/account">My account</Link> : <button onClick={() => openLogin()}>Sign in / Register</button>}
        </div>
        <div className="sw-footer-col" data-reveal="up">
          <h3>Shop</h3>
          <Link href="/products?category=Sweets">Traditional sweets</Link>
          <Link href="/products?category=Snacks">Tea-time snacks</Link>
          <Link href="/products?category=Pantry">Spices & pantry</Link>
          <Link href="/products?category=Pickles">Pickles</Link>
          <Link href="/wishlist">Your wishlist</Link>
        </div>
        <div className="sw-footer-col sw-footer-contact" data-reveal="up">
          <h3>Talk to us</h3>
          <a id="kitchen-contact" href="tel:+918296295658" className="sw-footer-phone">
            <Phone size={16} /> +91 82962 95658
          </a>
        </div>
      </div>

      <div className="sw-footer-service">
        <span>
          <Leaf size={16} /> Natural ingredients
        </span>
        <span>
          <CalendarDays size={16} /> <PickupText text="Prebook now for Diwali · Pickup 7 November · Bangalore only"/>
        </span>
        <span>
          <Truck size={16} /> Bangalore & across India
        </span>
      </div>

      <div className="sw-footer-legal">
        <span>© {new Date().getFullYear()} Swaadha. All rights reserved.</span>
        <div className="sw-footer-policy-links"><Link href="/terms-and-conditions">Terms &amp; Conditions</Link><Link href="/privacy-policy">Privacy Policy</Link></div>
        <span className="sw-footer-credit">
          Designed &amp; developed by{' '}
          <a href="https://rakvih.in" target="_blank" rel="noopener">
            RAKVIH
          </a>
        </span>
      </div>
    </footer>
  );
}
