'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from 'lucide-react';
import { loadBanners } from '@/lib/storefront';
import { Banner } from '@/lib/admin';
import { Seal } from './motion';

const fallback: Banner = {
  id: 'brand',
  tag: 'THE SWAADHA FAMILY KITCHEN',
  title: 'Rooted in tradition,',
  em: 'made with love.',
  text: 'Bringing authentic flavors and fresh ingredients from our family kitchen to yours.',
  image: '/images/hero.webp',
  label: 'Family favorites',
  href: '/products',
  display_order: 1,
  is_active: true,
};

export function HeritageHero() {
  const [slides, setSlides] = useState<Banner[] | null>(null);
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [cycled, setCycled] = useState(false);
  const hero = useRef<HTMLElement>(null);

  useEffect(() => {
    loadBanners()
      .then((data) => setSlides(data.length ? data : [fallback]))
      .catch(() => setSlides([fallback]));
  }, []);

  // Scroll-linked exit and pointer-linked drift, written straight to CSS variables.
  useEffect(() => {
    const el = hero.current;
    if (!el || !document.documentElement.classList.contains('motion')) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        el.style.setProperty('--hp', Math.min(1, window.scrollY / el.offsetHeight).toFixed(3));
      });
    };
    const onMove = (e: PointerEvent) => {
      el.style.setProperty('--hx', (e.clientX / window.innerWidth - 0.5).toFixed(3));
      el.style.setProperty('--hy', (e.clientY / window.innerHeight - 0.5).toFixed(3));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('scroll', onScroll);
      el.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  const list = slides ?? [];
  const current = active >= list.length ? 0 : active;
  const s = list[current];

  function go(i: number) {
    if (!list.length || i === current) return;
    setPrevious(current);
    setCycled(true);
    setActive((i + list.length) % list.length);
  }

  return (
    <section
      ref={hero}
      className={`sw-hero ${paused ? 'is-paused' : ''} ${cycled ? 'is-cycled' : ''}`}
      aria-label="Featured kitchen collections"
      aria-roledescription={list.length > 1 ? 'carousel' : undefined}
    >
      <div className="sw-hero-media">
        {list.map((slide, i) => (
          <div
            key={slide.id || i}
            className={`sw-hero-slide ${i === current ? 'is-active' : ''} ${i === previous && i !== current ? 'is-leaving' : ''}`}
            aria-hidden={i !== current}
          >
            <picture>{slide.mobile_image && <source media="(max-width: 760px)" srcSet={slide.mobile_image} />}<img src={slide.image} alt={i === current ? slide.label || slide.title : ''} fetchPriority={i === 0 ? 'high' : 'low'} /></picture>
          </div>
        ))}
      </div>
      <div className="sw-hero-shade" />
      <div className="sw-grain" />

      {s && (
        <div className="sw-hero-content" key={s.id || current}>
          <span className="sw-hero-tag">
            <i />
            {s.tag}
          </span>
          <h1 className="sw-hero-title">
            <span className="sw-line">
              <span>{s.title}</span>
            </span>{' '}
            <span className="sw-line">
              <span>
                <em>{s.em}</em>
              </span>
            </span>
          </h1>
          <p>{s.text}</p>
          <div className="sw-hero-ctas">
            <Link className="sw-btn is-gold" href={s.href || '/products'} data-magnetic>
              <span>Explore the collection</span>
              <ArrowUpRight size={18} />
            </Link>
            <Link className="sw-btn is-ghost-light" href="/our-story" data-magnetic>
              <span>Our story</span>
            </Link>
          </div>
        </div>
      )}

      <Seal className="sw-hero-seal" />

      {list.length > 1 && (
        <div className="sw-hero-foot">
          <div className="sw-hero-count" aria-live="polite">
            <b>0{current + 1}</b>
            <span>/ 0{list.length}</span>
          </div>
          <div className="sw-hero-bars">
            {list.map((slide, i) => (
              <button
                key={slide.id || i}
                className={i === current ? 'is-active' : i < current ? 'is-done' : ''}
                aria-label={`Show ${slide.label || slide.title}`}
                aria-pressed={i === current}
                onClick={() => go(i)}
              >
                <span className="sw-hero-bar">
                  <i onAnimationEnd={i === current ? () => go(current + 1) : undefined} />
                </span>
                <small>{slide.label || slide.title}</small>
              </button>
            ))}
          </div>
          <div className="sw-hero-arrows">
            <button aria-label="Previous collection" onClick={() => go(current - 1)}>
              <ArrowLeft size={17} />
            </button>
            <button aria-label="Next collection" onClick={() => go(current + 1)}>
              <ArrowRight size={17} />
            </button>
            <button aria-label={paused ? 'Play slideshow' : 'Pause slideshow'} onClick={() => setPaused(!paused)}>
              {paused ? <Play size={14} /> : <Pause size={14} />}
            </button>
          </div>
        </div>
      )}

      <a className="sw-hero-scroll" href="#after-hero" aria-label="Scroll to content">
        <span>Scroll</span>
        <i />
      </a>
    </section>
  );
}
