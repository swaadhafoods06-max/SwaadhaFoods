'use client';
import { ResponsiveRecords } from '@/components/admin/responsive-records';
import { useState } from 'react';
import { ArrowUpRight, CalendarDays, Download, IndianRupee, Search, ShoppingBag } from 'lucide-react';
import { useAdmin } from '@/components/admin/context';
import { money, statuses } from '@/lib/admin';

export default function OrdersPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const {
    busy,
    changeStatus,
    invoice,
    matchedOrders,
    orderStatus,
    query,
    setOrderDetail,
    setOrderStatus,
    setQuery,
  } = useAdmin();
  const validDates = !dateFrom || !dateTo || dateFrom <= dateTo;
  const visibleOrders = validDates
    ? matchedOrders.filter((order) => {
        const placedDate = new Date(order.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        return (!dateFrom || placedDate >= dateFrom) && (!dateTo || placedDate <= dateTo);
      })
    : [];
  const orderValue = visibleOrders.reduce((sum, order) => sum + (order.status === 'cancelled' ? 0 : Number(order.total)), 0);

  return (
    <>
      <title>Orders · Kitchen admin | Swaadha</title>
      <div className="report-toolbar">
        <div>
          <CalendarDays size={17} />
          <label>
            Placed from
            <input aria-label="Orders placed from" type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label>
            Placed to
            <input aria-label="Orders placed to" type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} />
          </label>
        </div>
        {(dateFrom || dateTo) && (
          <button className="orders-clear-dates" onClick={() => { setDateFrom(''); setDateTo(''); }}>
            Clear dates
          </button>
        )}
      </div>
      {!validDates && <p className="error">Choose a valid start and end date.</p>}
      <div className="dashboard-stats orders-summary">
        <article>
          <div><span>Total orders</span><ShoppingBag size={18} /></div>
          <strong>{visibleOrders.length}</strong>
          <small>Matching current filters</small>
        </article>
        <article>
          <div><span>Revenue (order value)</span><IndianRupee size={18} /></div>
          <strong>{money(orderValue)}</strong>
          <small>Excludes cancelled orders</small>
        </article>
      </div>
      <p className="report-disclaimer">Order value is not a record of payments collected.</p>
      <div className="listing-toolbar">
        <div>
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Search orders"
              placeholder="Search order, customer or phone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        <select aria-label="Filter order status" value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="admin-box-list">
        <div className="admin-box-container">
          
          <ResponsiveRecords>
            {visibleOrders.map((o) => (
              <article className="admin-record-box" key={o.id}>
                <div className="admin-record-field" data-label="Order / customer">
                  <b>#{o.id.slice(0, 10).toUpperCase()}</b>
                  <small>{o.customer_name}{o.phone && ` (${o.phone})`}</small>
                  {o.coupon_code && <small style={{ color: 'var(--red)' }}> · Coupon: {o.coupon_code}</small>}
                </div>
                <div className="admin-record-field" data-label="Requested date">{o.requested_date}</div>
                <div className="admin-record-field" data-label="Total">{money(o.total)}</div>
                <div className="admin-record-field" data-label="Status">
                  <select
                    className="order-status-select"
                    aria-label={`Status for ${o.id}`}
                    value={o.status}
                    disabled={busy}
                    onChange={(e) => changeStatus(o, e.target.value)}
                  >
                    {statuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-record-field" data-label="Details">
                  <div className="order-list-actions">
                    <button className="table-action" onClick={() => setOrderDetail(o)}>
                      View <ArrowUpRight size={15} />
                    </button>
                    <button className="table-action" disabled={busy} aria-label={`Download invoice for ${o.id}`} onClick={() => invoice(o)}>
                      <Download size={14} /> Invoice
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </ResponsiveRecords>
        </div>
        {!visibleOrders.length && <p className="empty">No matching orders.</p>}
      </div>
      <p className="table-help">Orders placed at checkout appear here. WhatsApp messages do not automatically create an order record.</p>
    </>
  );
}
