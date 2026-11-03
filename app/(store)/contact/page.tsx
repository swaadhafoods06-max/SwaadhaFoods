'use client';
import {PaymentInstructions} from '@/components/payment-instructions';
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
          <a className="sw-contact-card" href="tel:+918296295658" data-reveal="up">
            <span>
              <Phone size={20} />
            </span>
            <small>Call or WhatsApp</small>
            <b>+91 82962 95658</b>
          </a>
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
            <b>Order 6–7 days ahead</b>
          </div>
          <p className="sw-contact-note" data-reveal="up">
            Delivery after dispatch: Bangalore 24 hrs · Outside 4–10 days.
            <br />
            Bulk orders for marriages &amp; festivals: minimum 100 people.
          </p>
        </div>

        <form
          className="sw-panel sw-form"
          data-reveal="up"
          onSubmit={(e) => {
            e.preventDefault();
            window.open(whatsapp(`Hello Swaadha! My name is ${name}.\nPhone: ${phone}\n${message}`), '_blank', 'noopener,noreferrer');
          }}
        >
          <h2>
            A little hello <em>goes a long way.</em>
          </h2>
          <p>Tell us what you have in mind. We&apos;ll continue on WhatsApp.</p>
          <label className="sw-field">
            <span>Your name</span>
            <div className="sw-input">
              <input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="What should we call you?" autoComplete="name" />
            </div>
          </label>
          <label className="sw-field">
            <span>Phone number</span>
            <div className="sw-input">
              <input required type="tel" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your contact number" autoComplete="tel" />
            </div>
          </label>
          <label className="sw-field">
            <span>What&apos;s on your mind?</span>
            <div className="sw-input">
              <textarea required maxLength={2000} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Products, quantities, a special occasion…" />
            </div>
          </label>
          <button className="sw-btn is-red is-block" type="submit">
            <MessageCircle size={17} />
            <span>Continue on WhatsApp</span>
            <ArrowUpRight size={17} />
          </button>
          <small className="sw-hint">This opens WhatsApp with your message. Press send there to reach us.</small>
        </form>
      </section>
    <PaymentInstructions/></>
  );
}
