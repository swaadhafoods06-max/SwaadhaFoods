'use client';
import {PaymentProofReview} from '../payment-proof-review';
import { Download } from 'lucide-react';
import { money } from '@/lib/admin';
import { Modal } from '../modal';
import { ShippingPanel } from '../shipping-panel';
import { useAdmin } from '../context';

/** Full order details, invoice and Shiprocket delivery. */
export function OrderDialog() {
  const { orderDetail, busy, invoice, setOrderDetail, setRevision } = useAdmin();
  if (!orderDetail) return null;

  return (
    <Modal title={`Order #${orderDetail.id.slice(0, 10).toUpperCase()}`} onClose={() => setOrderDetail(null)}>
      <div className="order-detail"><PaymentProofReview orderId={orderDetail.id}/>
        <span className={`status ${orderDetail.status}`}>{orderDetail.status}</span>
        <h3>{orderDetail.customer_name}</h3>
        <p>
          {orderDetail.phone}
          {orderDetail.alt_phone && <> · Alt: {orderDetail.alt_phone}</>}
          <br />
          {[orderDetail.address, orderDetail.city, orderDetail.state, orderDetail.pincode].filter(Boolean).join(', ')}
        </p>
        <p>
          Requested date: <b>{orderDetail.requested_date}</b>
        </p>
        {orderDetail.items.map((item, i) => (
          <div className="order-line" key={i}>
            <span>
              {item.name}
              <small>
                {item.weight} × {item.quantity}
              </small>
            </span>
            <b>{money(item.price * item.quantity)}</b>
          </div>
        ))}
        {orderDetail.coupon_code && (
          <div className="order-line" style={{ color: 'var(--red)' }}>
            <span>Coupon applied ({orderDetail.coupon_code})</span>
            <b>- {money(orderDetail.discount || 0)}</b>
          </div>
        )}
        <div className="order-total">
          <span>Order value</span>
          <strong>{money(orderDetail.total)}</strong>
        </div>
        <p className="table-help">
          Payment: {(orderDetail.payment_method === 'COD' || !orderDetail.payment_method ? 'UPI / QR' : orderDetail.payment_method)} · {orderDetail.payment_status || 'unpaid'}.
        </p>
        <button className="button outline" disabled={busy} onClick={() => invoice(orderDetail)}>
          <Download size={16} /> Download invoice PDF
        </button>
        <ShippingPanel key={orderDetail.id} order={orderDetail} onChanged={() => setRevision((n) => n + 1)} />
      </div>
    </Modal>
  );
}
