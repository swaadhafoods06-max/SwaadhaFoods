'use client';
import { useEffect, useState } from 'react';
import { ExternalLink, ImageOff } from 'lucide-react';
import { supabase } from '@/lib/supabase-admin';

type Proof = { id: string; url: string; created_at: string };

/** Payment screenshots the customer attached to an order, newest first. Signed links last 5 minutes. */
export function PaymentProofReview({ orderId }: { orderId: string }) {
  const [files, setFiles] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    async function load() {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('payment_proofs')
        .select('id,image_path,created_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      if (error) throw new Error('Payment screenshots unavailable. Check the payment-proofs migration.');
      const signed = await Promise.all(
        (data ?? []).map(async (p) => {
          const { data, error } = await supabase!.storage.from('payment-proofs').createSignedUrl(p.image_path, 300);
          if (error) throw error;
          return { id: p.id, url: data.signedUrl, created_at: p.created_at };
        })
      );
      if (live) setFiles(signed);
    }
    setLoading(true);
    setError('');
    load()
      .catch((e) => live && setError(e instanceof Error && e.message.includes('migration') ? e.message : 'Could not load payment screenshots.'))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [orderId]);

  if (loading) return <p className="proof-empty">Loading screenshots…</p>;
  if (error)
    return (
      <p className="error" role="alert">
        {error}
      </p>
    );
  if (!files.length)
    return (
      <p className="proof-empty">
        <ImageOff size={18} /> No payment screenshot submitted yet.
      </p>
    );

  return (
    <div className="proof-grid">
      {files.map((f, i) => (
        <a className="proof-card" href={f.url} key={f.id} target="_blank" rel="noreferrer">
          <img src={f.url} alt="Customer payment screenshot — verify against your payment records" />
          <span>
            {i === 0 && files.length > 1 ? 'Latest · ' : ''}
            {new Date(f.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}
            <ExternalLink size={13} />
          </span>
        </a>
      ))}
    </div>
  );
}
