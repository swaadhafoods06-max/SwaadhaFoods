import {PickupText} from '@/components/pickup-date';
import { Fragment } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, Heart, Leaf, ShieldCheck, ShoppingBag, Truck, Users } from 'lucide-react';
import { HeritageHero } from '@/components/heritage-hero';
import { Catalog } from '@/components/catalog';
import { Lines, Marquee, Ornament, ScrubWords, Seal } from '@/components/motion';

const cravings = [
  { name: 'Traditional sweets', category: 'Sweets', note: 'For every celebration', image: '/images/products/rava-ladoo.jpg' },
  { name: 'Tea-time favorites', category: 'Snacks', note: 'Crunchy little moments', image: '/images/banner-snacks.jpg' },
  { name: 'The spice pantry', category: 'Pantry', note: 'A spoonful of home', image: '/images/products/sambar-powder.jpg' },
  { name: 'Pickles', category: 'Pickles', note: 'Bold, tangy, nostalgic', image: '/images/pickle.webp' },
];

const vows = [
  { Icon: Leaf, title: '100% natural', text: 'Pure goodness, without artificial additives.', note: 'Only the good stuff' },
  { Icon: ShieldCheck, title: 'Chemical-free', text: 'No harmful chemicals or preservatives. Ever.', note: 'Nothing to hide' },
  { Icon: Heart, title: 'Made with love', text: 'Traditional recipes, with a personal touch in every batch.', note: 'Care you can taste' },
];

const steps = [
  { Icon: ShoppingBag, title: 'Find your favorites', text: 'A little sweet, a little spice. Add your homemade favorites to the cart.' },
  { Icon: CalendarDays, title: 'Made just for you', text: 'Prebook now for Diwali. Pickup date: 7 November. Delivery within Bangalore only until 7 November. Porter/Dunzo (charges self-pay).' },
  { Icon: Truck, title: 'Home, delivered', text: 'Delivery within Bangalore only until 7 November. Porter/Dunzo (charges self-pay).' },
  { Icon: Users, title: 'Bring everyone along', text: 'Marriages, festivals and family occasions. Bulk orders for 100+ people.' },
];

export default function Home() {
  return (
    <div className="sw-home-page">
      <HeritageHero />

      <div id="after-hero" />

      <section className="sw-section sw-band is-gold-band sw-cravings">
        <div className="sw-head is-center">
          <span className="sw-kicker" data-reveal="fade">
            Shop by craving
          </span>
          <Lines lines={['Little joys from', <em key="e">our kitchen.</em>]} />
          <p data-reveal="up">Sweet celebrations, tea-time traditions, and the spices that make a meal feel like home.</p>
        </div>
        <div className="sw-craving-grid" data-stagger>
          {cravings.map((c, i) => (
            <Link href={`/products?category=${c.category}`} key={c.name} className="sw-craving" data-reveal="clip">
              <span className="sw-craving-img">
                <img src={c.image} alt="" loading="lazy" />
              </span>
              <span className="sw-craving-num">0{i + 1}</span>
              <span className="sw-craving-copy">
                <small>{c.note}</small>
                <b>{c.name}</b>
              </span>
              <span className="sw-craving-arrow">
                <ArrowUpRight size={20} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="sw-manifesto sw-band is-red-band">
        <Ornament />
        <ScrubWords text="We cook the way our mothers taught us — slowly, honestly, in small batches, with ingredients we would serve our own family. No shortcuts. No preservatives. Just the taste of home." />
      </section>

      <section className="sw-section sw-band is-gold-band sw-favorites" id="favorites">
        <div className="sw-head is-split">
          <div>
            <span className="sw-kicker" data-reveal="fade">
              Fresh from our family kitchen
            </span>
            <Lines lines={['A cupboard full', <Fragment key="e">of <em>happy things.</em></Fragment>]} />
          </div>
          <div className="sw-head-aside" data-reveal="up">
            <p>A crunchy bite. A sweet little moment. Find your kind of homemade comfort.</p>
            <Link className="sw-link" href="/products">
              See the whole kitchen <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
        <Catalog featured />
      </section>

      <section className="sw-story is-red-band">
        <div className="sw-grain" />
        <div className="sw-story-art" data-reveal="scale">
          <div className="sw-story-ring" aria-hidden="true" />
          <Seal className="sw-story-seal" text="MOTHER & DAUGHTER ✦ FAMILY KITCHEN ✦ SINCE ALWAYS ✦ " />
          <div className="sw-story-medallion">
            <img src="/family-logo.png" alt="Swaadha mother and daughter family illustration" />
          </div>
        </div>
        <div className="sw-story-copy">
          <span className="sw-kicker is-light" data-reveal="fade">
            More than a recipe
          </span>
          <Lines lines={['A family feeling.', <em key="e">In every bite.</em>]} />
          <p data-reveal="up">
            The care in choosing every ingredient. The patience in getting the flavor just right. The joy of sharing something
            we&apos;ve made with our own hands. That&apos;s what goes into every Swaadha batch.
          </p>
          <dl className="sw-stats" data-stagger>
            <div data-reveal="up">
              <dt>
                <span data-count="100">100</span>%
              </dt>
              <dd>Natural ingredients</dd>
            </div>
            <div data-reveal="up">
              <dt>
                <span data-count="0">0</span>
              </dt>
              <dd>Preservatives added</dd>
            </div>
            <div data-reveal="up">
              <dt>
                <span data-count="7">7</span>
                <small>days</small>
              </dt>
              <dd>Of care in every order</dd>
            </div>
            <div data-reveal="up">
              <dt>
                <span data-count="100">100</span>+
              </dt>
              <dd>Guests per celebration</dd>
            </div>
          </dl>
          <Link className="sw-btn is-gold" href="/our-story" data-reveal="up" data-magnetic>
            <span>A seat at our table</span>
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>

      <section className="sw-section sw-band is-gold-band sw-vows">
        <div className="sw-head is-center">
          <span className="sw-kicker" data-reveal="fade">
            Nothing extra. Just goodness.
          </span>
          <Lines lines={['Our word.', <em key="e">From the heart.</em>]} />
        </div>
        <div className="sw-vow-grid" data-stagger>
          {vows.map(({ Icon, title, text, note }) => (
            <article key={title} className="sw-vow" data-reveal="up">
              <div className="sw-vow-seal">
                <Icon size={28} strokeWidth={1.3} />
              </div>
              <h3>{title}</h3>
              <p><PickupText text={text}/></p>
              <span>{note}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="sw-process sw-band is-red-band" data-scrub>
        <div className="sw-process-sticky">
          <span className="sw-kicker" data-reveal="fade">
            From our kitchen to your door
          </span>
          <Lines lines={['Good things take', <em key="e">a little love.</em>]} />
          <p data-reveal="up">A little planning, and we&apos;ll take care of the homemade goodness.</p>
          <div className="sw-process-rail" aria-hidden="true">
            <i />
          </div>
          <Link className="sw-btn is-gold" href="/products" data-reveal="up" data-magnetic>
            <span>Find your first favorite</span>
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <ol className="sw-process-steps">
          {steps.map(({ Icon, title, text }, i) => (
            <li key={title} data-reveal="right">
              <span className="sw-process-num">0{i + 1}</span>
              <div className="sw-process-icon">
                <Icon size={24} strokeWidth={1.4} />
              </div>
              <h3>{title}</h3>
              <p><PickupText text={text}/></p>
            </li>
          ))}
        </ol>
      </section>

      <div className="sw-celebrate-wrap is-gold-band">
      <section className="sw-celebrate">
        <div className="sw-celebrate-media">
          <img src="/images/banner-sweets.jpg" alt="A festive selection of homemade Swaadha sweets" loading="lazy" data-parallax="0.12" />
        </div>
        <div className="sw-celebrate-shade" />
        <div className="sw-celebrate-copy">
          <span className="sw-kicker is-light" data-reveal="fade">
            For the moments that bring us together
          </span>
          <Lines lines={['A little homemade.', <em key="e">A big celebration.</em>]} />
          <p data-reveal="up">Marriages, festivals and family gatherings. Freshly prepared bulk orders for 100+ people.</p>
          <Link className="sw-btn is-gold" href="/contact" data-reveal="up" data-magnetic>
            <span>Plan something delicious</span>
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      </div>
    </div>
  );
}
