import Link from 'next/link';
import { ArrowUpRight, CalendarDays, Leaf } from 'lucide-react';
import { Catalog } from '@/components/catalog';
import { PageHero } from '@/components/page-hero';
import { Seal } from '@/components/motion';

export const metadata = { title: 'Our kitchen' };

export default function Products() {
  return (
    <>
      <PageHero
        kicker="The Swaadha pantry"
        lines={['Your favorites.', <em key="e">Our family recipes.</em>]}
        text="Something sweet. Something crunchy. A little spice. Find the flavors that make you feel at home."
      >
        <div className="sw-stack">
          <figure className="sw-stack-main" data-reveal="clip">
            <img src="/images/banner-snacks.jpg" alt="Traditional homemade chakli, nippattu and karjikayi on a brass platter" fetchPriority="high" />
          </figure>
          <figure className="sw-stack-small" data-reveal="scale" data-parallax="0.08">
            <img src="/images/banner-sweets.jpg" alt="A selection of homemade laddoos" />
          </figure>
          <Seal className="sw-stack-seal" text="FRESH FROM OUR KITCHEN ✦ SMALL BATCHES ✦ " />
        </div>
      </PageHero>

      <section className="sw-section sw-shop" id="kitchen-menu">
        <Catalog />
        <div className="sw-callout" data-reveal="up">
          <div>
            <h3>Something special in mind?</h3>
            <p>Ask us about ingredients, allergens, the current menu, or bulk orders for your next celebration.</p>
          </div>
          <Link className="sw-link" href="/contact">Contact our kitchen</Link>
        </div>
      </section>
    </>
  );
}
