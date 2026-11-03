'use client';
import Link from 'next/link';
import { ArrowUpRight, BarChart3, CalendarDays, Download, Package, ShoppingBag } from 'lucide-react';
import { useAdmin } from '@/components/admin/context';
import { navigation } from '@/components/admin/config';
import { money, statuses, statusLabels } from '@/lib/admin';

/** Shared by the Dashboard and Analytics & reports pages; `tab` decides which extras are shown. */
export function ReportView({ tab }: { tab: 'dashboard' | 'reports' }) {
  const { can, downloadReport, from, loading, report, setFrom, setTo, to } = useAdmin();
  return (
    <>
      <div className="report-toolbar">
        <div>
          <CalendarDays size={17} />
          <label>
            From
            <input aria-label="Report start date" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            To
            <input aria-label="Report end date" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        {tab === 'reports' && (
          <div className="report-actions">
            <button className="button outline" disabled={!from || !to || from > to || loading} onClick={downloadReport}>
              <Download size={15} /> Download CSV
            </button>
            <button className="button outline" onClick={() => window.print()}>
              Print / Save PDF
            </button>
          </div>
        )}
      </div>

      {!from || !to || from > to ? (
        <p className="error">Choose a valid start and end date.</p>
      ) : (
        <>
          <div className="dashboard-stats">
            {[
              { label: 'Order requests', value: String(report.total_orders), icon: ShoppingBag, note: 'Within selected dates' },
              { label: 'Order value', value: money(report.order_value), icon: BarChart3, note: 'Excludes cancelled orders' },
              { label: 'Awaiting confirmation', value: String(report.pending), icon: CalendarDays, note: 'Pending orders' },
              { label: 'Active products', value: String(report.active_products), icon: Package, note: 'Current visible catalog' },
            ].map(({ label, value, icon: Icon, note }) => (
              <article key={label}>
                <div>
                  <span>{label}</span>
                  <Icon size={18} />
                </div>
                <strong>{value}</strong>
                <small>{note}</small>
              </article>
            ))}
          </div>

          <p className="report-disclaimer">
            Order value reflects orders, not payments collected. No payment processing is enabled.
          </p>

          <div className="analytics-grid">
            <section className="dashboard-card">
              <div className="card-heading">
                <div>
                  <h3>Order activity</h3>
                  <p>Orders placed by day</p>
                </div>
                <span>
                  {from} → {to}
                </span>
              </div>
              {report.daily.length ? (
                <div className="activity-chart">
                  {report.daily.map((d) => (
                    <div key={d.day} title={`${d.day}: ${d.orders} requests, ${money(d.value)}`}>
                      <span>{d.orders}</span>
                      <i style={{ height: `${Math.max(5, (d.orders / Math.max(...report.daily.map((x) => x.orders))) * 130)}px` }} />
                      <small>{d.day.slice(5)}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty">Order activity will appear after customers place requests.</p>
              )}
            </section>

            <section className="dashboard-card">
              <div className="card-heading">
                <div>
                  <h3>In the kitchen</h3>
                  <p>Orders by status</p>
                </div>
              </div>
              <div className="status-breakdown">
                {statuses.map((s) => {
                  const count = report.by_status.find((x) => x.status === s)?.count || 0;
                  return (
                    <div key={s}>
                      <span className={`status ${s}`}>{statusLabels[s]}</span>
                      <div>
                        <i style={{ width: `${report.total_orders ? (count / report.total_orders) * 100 : 0}%` }} />
                      </div>
                      <b>{count}</b>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {tab === 'reports' ? (
            <>
              <section className="dashboard-card report-detail">
                <div className="card-heading">
                  <div>
                    <h3>Daily report</h3>
                    <p>
                      India Standard Time · {from} to {to}
                    </p>
                  </div>
                </div>
                <div className="admin-table report-mobile-boxes">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Order requests</th>
                        <th>Order value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.daily.map((d) => (
                        <tr key={d.day}>
                          <td data-label="Date">{d.day}</td>
                          <td data-label="Order requests">{d.orders}</td>
                          <td data-label="Order value">{money(d.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!report.daily.length && <p className="empty">No orders in this date range.</p>}
                </div>
              </section>

              <section className="dashboard-card report-detail">
                <h3>Most ordered products</h3>
                <div className="admin-table report-mobile-boxes">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Units requested</th>
                        <th>Order value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.top_products.map((p) => (
                        <tr key={p.name}>
                          <td data-label="Product">{p.name}</td>
                          <td data-label="Units requested">{p.quantity}</td>
                          <td data-label="Order value">{money(p.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <div className="dashboard-lower">
              <section className="dashboard-card">
                <div className="card-heading">
                  <div>
                    <h3>Kitchen shortcuts</h3>
                    <p>A little less admin. A little more cooking.</p>
                  </div>
                </div>
                <div className="quick-actions">
                  {navigation
                    .filter((n) => n.id !== 'dashboard' && can(n.id))
                    .map(({ id, label, icon: Icon }) => (
                      <Link key={id} href={`/admin/${id}`}>
                        <Icon size={18} />
                        <span>{label}</span>
                        <ArrowUpRight size={15} />
                      </Link>
                    ))}
                </div>
              </section>
              <section className="kitchen-note">
                <span>THE SWAADHA WAY</span>
                <h3>
                  Small batches.
                  <br />
                  Big possibilities.
                </h3>
                <p>Keep your menu fresh, your orders organized, and your team in sync.</p>
                <Link href="/" className="text-link">
                  See your storefront <ArrowUpRight size={15} />
                </Link>
              </section>
            </div>
          )}
        </>
      )}
    </>
  );
}
