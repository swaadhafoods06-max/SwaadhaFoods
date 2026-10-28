'use client';
import { useState } from 'react';
import { ArrowUpRight, Download, RefreshCw, Truck } from 'lucide-react';
import { supabase } from '@/lib/supabase-admin';
import type { Order } from '@/lib/admin';

export function ShippingPanel({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const [current, setCurrent] = useState(order);
  const [length, setLength] = useState(20);
  const [breadth, setBreadth] = useState(15);
  const [height, setHeight] = useState(10);
  const [weight, setWeight] = useState(0.5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [label, setLabel] = useState('');

  async function action(kind: 'create' | 'track' | 'label') {
    if (!supabase) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Sign in again to manage shipping.');
      const response = await fetch('/api/shiprocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: kind, order_id: current.id, length, breadth, height, weight }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Shiprocket could not complete this action.');
      setNotice(data.message);
      if (data.label_url) setLabel(data.label_url);
      const updated = await supabase.from('orders').select('*').eq('id', current.id).single();
      if (updated.data) setCurrent(updated.data);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Shipping is temporarily unavailable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="shipping-panel">
      <div className="shipping-title">
        <Truck size={20} />
        <h3>Shiprocket delivery</h3>
      </div>
      <p className="table-help">
        Shiprocket order: {current.shiprocket_order_id || 'Not created'}
        <br />
        Shipment ID: {current.shipment_id || 'Not assigned'}
        {current.shipping_state && <> · {current.shipping_state}</>}
      </p>
      {current.awb_code && (
        <p className="table-help">
          {current.courier_name} · AWB {current.awb_code}
        </p>
      )}
      {current.tracking_url?.startsWith('https://') && (
        <a className="text-link" href={current.tracking_url} target="_blank" rel="noreferrer">
          Track parcel <ArrowUpRight size={14} />
        </a>
      )}

      {!current.shiprocket_order_id && (
        <>
          <p className="table-help">Confirm the order, then enter the actual packed parcel measurements.</p>
          <div className="shipping-measures">
            <label>
              Length (cm)
              <input type="number" min="1" max="200" value={length} onChange={(e) => setLength(Number(e.target.value))} />
            </label>
            <label>
              Breadth (cm)
              <input type="number" min="1" max="200" value={breadth} onChange={(e) => setBreadth(Number(e.target.value))} />
            </label>
            <label>
              Height (cm)
              <input type="number" min="1" max="200" value={height} onChange={(e) => setHeight(Number(e.target.value))} />
            </label>
            <label>
              Weight (kg)
              <input type="number" min="0.01" step="0.01" max="100" value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
            </label>
          </div>
          <button
            className="button outline"
            disabled={
              busy ||
              !['confirmed', 'preparing'].includes(current.status) ||
              ['creating', 'needs_review'].includes(current.shipping_state || '')
            }
            onClick={() => action('create')}
          >
            <Truck size={15} /> Create Shiprocket order
          </button>
        </>
      )}

      {current.shipment_id && (
        <div className="shipping-actions">
          <button className="button outline" disabled={busy} onClick={() => action('track')}>
            <RefreshCw size={14} /> Sync tracking
          </button>
          <button className="button outline" disabled={busy} onClick={() => action('label')}>
            <Download size={14} /> Get label
          </button>
        </div>
      )}

      {label && (
        <a className="text-link" href={label} target="_blank" rel="noreferrer">
          Open shipping label <ArrowUpRight size={14} />
        </a>
      )}
      <p className="table-help">
        Assign courier/AWB and schedule pickup in{' '}
        <a href="https://app.shiprocket.in/" target="_blank" rel="noreferrer">
          your Shiprocket dashboard ↗
        </a>
        .
      </p>
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
