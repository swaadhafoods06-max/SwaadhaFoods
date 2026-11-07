'use client';
import {PickupText} from '@/components/pickup-date';
import { useState } from 'react';
import { ArrowUpRight, Clock, MapPin, MessageCircle, Phone } from 'lucide-react';
import { PageHero } from '@/components/page-hero';
import { whatsapp } from '@/lib/products';

export default function Contact() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  return (
    <>
      <PageHero
        compact
        kicker="Our kitchen is just a message away"
        lines={['Let’s talk', <em key="e">good food.</em>]}
        text="An everyday craving or a big celebration? We’d love to hear what’s cooking."
      />
      <section className="sw-section sw-contact">
        <div className="sw-contact-cards" data-stagger>
          <div className="sw-contact-card" data-reveal="up">
            <span>
              <MapPin size={20} />
            </span>
            <small>From our kitchen</small>
            <b>Bangalore, India</b>
          </div>
          <div className="sw-contact-card" data-reveal="up">
            <span>
              <Clock size={20} />
            </span>
            <small>A little planning goes a long way</small>
            <b><PickupText text="Prebook now for Diwali · Pickup 7 November · Bangalore only"/></b>
          </div>

        </div>

        <form className="sw-panel sw-form" onSubmit={(event) => {
          event.preventDefault();
          window.open(whatsapp(`Hello Swaadha!\nName: ${name.trim()}\nPhone: ${phone.trim()}\n\n${message.trim()}`), '_blank', 'noopener,noreferrer');
        }}>
          <h2>A little hello <em>goes a long way.</em></h2>
          <p>Tell us what you have in mind. We'll continue on WhatsApp.</p>
          <label className="sw-field"><span>Your name</span><div className="sw-input"><input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="What should we call you?" /></div></label>
          <label className="sw-field"><span>Phone number</span><div className="sw-input"><Phone size={17}/><input required type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your contact number" /></div></label>
          <label className="sw-field"><span>What's on your mind?</span><div className="sw-input"><textarea required rows={5} value={message} onChange={e => setMessage(e.target.value)} placeholder="Products, quantities, a special occasion…" /></div></label>
          <button type="submit" className="sw-btn is-red">Continue on WhatsApp <ArrowUpRight size={17}/></button>
          <p>This opens WhatsApp with your message. Press send there to reach us.</p>
        </form>
      </section>
    </>
  );
}
