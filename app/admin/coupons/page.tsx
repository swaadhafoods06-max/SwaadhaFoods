'use client';
import { ResponsiveRecords } from '@/components/admin/responsive-records';
import { Pencil, Search, Trash2 } from 'lucide-react';
import { useAdmin } from '@/components/admin/context';
import { money } from '@/lib/admin';

export default function CouponsPage() {
  const {
    busy,
    coupons,
    deleteCoupon,
    matchedCoupons,
    query,
    setCouponEdit,
    setQuery,
    toggleCoupon,
  } = useAdmin();
  return (
    <>
      <title>Coupons & offers · Kitchen admin | Swaadha</title>
      <div className="listing-toolbar">
        <span>{coupons.length} promotional coupons</span>
        <label className="search">
          <Search size={16} />
          <input
            aria-label="Search coupons"
            placeholder="Search coupon code or description"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="admin-box-list">
        <div className="admin-box-container">
          
          <ResponsiveRecords>
            {matchedCoupons.map((c) => (
              <article className="admin-record-box" key={c.id}>
                <div className="admin-record-field" data-label="Code">
                  <strong style={{ letterSpacing: '1px', color: 'var(--red)' }}>{c.code}</strong>
                  <br />
                  <small>{c.description || 'Promotional coupon'}</small>
                </div>
                <div className="admin-record-field" data-label="Discount">
                  <b>{c.discount_type === 'percentage' ? `${c.discount_value}% off` : `₹${c.discount_value} flat off`}</b>
                  {c.max_discount ? (
                    <small>
                      <br />
                      Up to ₹{c.max_discount}
                    </small>
                  ) : null}
                </div>
                <div className="admin-record-field" data-label="Min order">{c.min_order_value ? money(c.min_order_value) : 'No minimum'}</div>
                <div className="admin-record-field" data-label="Usage">
                  {c.times_used} {c.usage_limit ? `/ ${c.usage_limit}` : 'uses'}
                </div>
                <div className="admin-record-field" data-label="Expiry date">{c.expiry_date ? new Date(c.expiry_date).toLocaleDateString('en-IN') : 'No expiry'}</div>
                <div className="admin-record-field" data-label="Status">
                  <button
                    disabled={busy}
                    className={`status ${c.is_active ? 'available' : ''}`}
                    onClick={() => toggleCoupon(c)}
                  >
                    {c.is_active ? 'Active' : 'Disabled'}
                  </button>
                </div>
                <div className="admin-record-field" data-label="Actions">
                  <div className="order-list-actions">
                    <button className="table-action" aria-label={`Edit ${c.code}`} onClick={() => setCouponEdit(c)}>
                      <Pencil size={15} /> Edit
                    </button>
                    <button className="table-action" aria-label={`Delete ${c.code}`} onClick={() => deleteCoupon(c)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </ResponsiveRecords>
        </div>
        {!matchedCoupons.length && <p className="empty">No coupons configured. Create a promotional code for your shoppers.</p>}
      </div>
      <p className="table-help">Customers can enter active coupon codes at cart checkout. Discounts are verified server-side.</p>
    </>
  );
}
