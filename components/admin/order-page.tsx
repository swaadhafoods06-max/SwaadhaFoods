'use client';
import Link from 'next/link';
import { ArrowLeft, BadgeCheck, CircleX, Download, ImageIcon, Mail, MapPin, Package, Phone, ReceiptText } from 'lucide-react';
import { money, statuses } from '@/lib/admin';
import { useAdmin } from './context';
import { PaymentProofReview } from './payment-proof-review';
import { ShippingPanel } from './shipping-panel';

const paymentLabel = { paid: 'Verified', rejected: 'Rejected', unpaid: 'Awaiting verification' } as const;

/** Full-page view of one order: items, address, payment screenshots and verification, status and invoice. */
export function OrderPage({ id }: { id: string }) {
  const { orders, products, busy, ready, loading, changeStatus, changePaymentStatus, invoice, setRevision } = useAdmin();
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="order-page">
        <Link className="order-back" href="/admin/orders">
          <ArrowLeft size={16} /> All orders
        </Link>
        <p className="empty">{ready && !loading ? 'This order could not be found.' : 'Loading order…'}</p>
      </div>
    );
  }

  const subtotal = order.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const payment = (order.payment_status as keyof typeof paymentLabel) in paymentLabel ? (order.payment_status as keyof typeof paymentLabel) : 'unpaid';
  const method = order.payment_method === 'COD' || !order.payment_method ? 'UPI / QR' : order.payment_method;
  const placed = new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });

  return (
    <div className="order-page">
      <title>{`Order #${order.id.slice(0, 8).toUpperCase()} · Kitchen admin | Swaadha`}</title>
      <header className="order-page-head">
        <Link className="order-back" href="/admin/orders">
          <ArrowLeft size={16} /> All orders
        </Link>
        <div className="order-page-title">
          <h2>Order #{order.id.slice(0, 10).toUpperCase()}</h2>
          <span className={`status ${order.status}`}>{order.status}</span>
          <span className={`pay-badge is-${payment}`}>{paymentLabel[payment]}</span>
        </div>
        <p>
          Placed {placed}
          {order.invoice_number && <> · Invoice {order.invoice_number}</>}
        </p>
      </header>

      <div className="order-page-grid">
        <div className="order-page-main">
          <section>
            <h3 className="order-label">Items</h3>
            <div className="order-card order-items">
              {order.items.map((item, i) => {
                const image = products.find((p) => p.id === item.product_id)?.image;
                return (
                  <div className="order-item" key={i}>
                    {image ? <img src={image} alt="" /> : <span className="order-item-ph"><Package size={20} /></span>}
                    <div>
                      <b>{item.name}</b>
                      <small>
                        {item.weight} · Qty {item.quantity}
                      </small>
                    </div>
                    <div className="order-item-price">
                      <small>{money(item.price)} each</small>
                      <b>{money(Number(item.price) * item.quantity)}</b>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="order-label">Shipping address</h3>
            <div className="order-card order-address">
              <MapPin size={18} />
              <div>
                <p>
                  <b>{order.customer_name}</b>
                </p>
                <p>{order.address}</p>
                <p>{[order.city, order.state, order.pincode].filter(Boolean).join(', ')}</p>
                <div className="order-contacts">
                  <a href={`tel:${order.phone}`}>
                    <Phone size={14} /> {order.phone}
                  </a>
                  {order.alt_phone && (
                    <a href={`tel:${order.alt_phone}`}>
                      <Phone size={14} /> {order.alt_phone} <small>(alternative)</small>
                    </a>
                  )}
                  {order.email && (
                    <a href={`mailto:${order.email}`}>
                      <Mail size={14} /> {order.email}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="order-label">
              <ImageIcon size={14} /> Payment screenshots
            </h3>
            <div className="order-card">
              <PaymentProofReview orderId={order.id} />
              <p className="table-help">Check the amount and reference in your bank or UPI app before verifying. A screenshot alone is not proof of payment.</p>
            </div>
          </section>

          <ShippingPanel key={order.id} order={order} onChanged={() => setRevision((n) => n + 1)} />
        </div>

        <aside className="order-page-side">
          <section>
            <h3 className="order-label">Payment summary</h3>
            <div className="order-card order-summary">
              <div>
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              {order.coupon_code && (
                <div className="is-discount">
                  <span>Coupon ({order.coupon_code})</span>
                  <span>- {money(order.discount || 0)}</span>
                </div>
              )}
              <div>
                <span>Shipping charges</span>
                <span className="order-muted">Paid at delivery</span>
              </div>
              <div className="is-total">
                <span>Amount to receive</span>
                <span>{money(order.total)}</span>
              </div>
              <div className="order-muted">
                <span>Payment</span>
                <span>
                  {paymentLabel[payment]} · {method}
                </span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="order-label">Verify payment</h3>
            <div className="order-verify">
              <button className="button" disabled={busy || payment === 'paid'} onClick={() => changePaymentStatus(order, 'paid')}>
                <BadgeCheck size={16} /> {payment === 'paid' ? 'Payment verified' : 'Mark as paid'}
              </button>
              <button className="button outline" disabled={busy || payment === 'rejected'} onClick={() => changePaymentStatus(order, 'rejected')}>
                <CircleX size={16} /> Reject
              </button>
            </div>
          </section>

          <section>
            <h3 className="order-label">Update status</h3>
            <select
              className="order-page-status"
              aria-label="Order status"
              value={order.status}
              disabled={busy}
              onChange={(e) => changeStatus(order, e.target.value)}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </section>

          <button className="button outline order-invoice" disabled={busy} onClick={() => invoice(order)}>
            <Download size={16} /> Download invoice
          </button>
          <p className="table-help">
            <ReceiptText size={13} /> Requested date: {order.requested_date}
          </p>
        </aside>
      </div>
    </div>
  );
}
