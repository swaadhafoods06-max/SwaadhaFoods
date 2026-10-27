'use client';

import React from 'react';
import { Check, Copy, Download, Printer, X } from 'lucide-react';
import { MAX_LABEL_CODE_LENGTH, skuBarcode, type Product } from '@/lib/products';
import {
  code39Bars,
  LABEL_BRAND,
  LABEL_LAYOUT,
  LABEL_SIZES,
  labelPdf,
  labelPrice,
  labelWeight,
  type LabelSize,
} from '@/lib/labels';

export function cleanBarcodeValue(val: string): string {
  const cleaned = val.toUpperCase().replace(/[^0-9A-Z\-.$/+% ]/g, '');
  return cleaned || 'SW0001';
}

export { MAX_LABEL_CODE_LENGTH };

/**
 * The code printed on a product's label and expected from the scanner. Products without a saved
 * barcode or SKU fall back to a code built from their id, so every product can be scanned.
 */
export function productBarcode(p: Pick<Product, 'id' | 'barcode' | 'sku'>): string {
  return cleanBarcodeValue(p.barcode || p.sku || `SW${p.id.slice(0, 6)}`);
}

/** The longer fallback code older labels were printed with; still accepted at the POS. */
export function legacyProductBarcode(p: Pick<Product, 'id'>): string {
  return cleanBarcodeValue(`SW-${p.id.slice(0, 8)}`);
}

/**
 * A new, short barcode: made from the SKU when it fits a label, otherwise SW + 6 digits.
 * `taken` holds existing codes so two products never share one.
 */
export function generateBarcodeValue(sku?: string, taken: Iterable<string> = []): string {
  const used = new Set(taken);
  const fromSku = sku?.trim() ? skuBarcode(sku) : '';
  if (fromSku && fromSku.length <= MAX_LABEL_CODE_LENGTH && !used.has(fromSku)) return fromSku;
  let code: string;
  do {
    code = `SW${Math.floor(100000 + Math.random() * 900000)}`;
  } while (used.has(code));
  return code;
}

/** Code 39 bars only (no text), stretched to fill whatever box it's placed in. */
export function BarcodeSvg({ value, className = '', style }: { value: string; className?: string; style?: React.CSSProperties }) {
  const { bars, width } = code39Bars(cleanBarcodeValue(value));
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} 10`}
      preserveAspectRatio="none"
      className={className}
      style={style}
      role="img"
      aria-label={`Barcode ${value}`}
    >
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.width} height={10} fill="#111" />
      ))}
    </svg>
  );
}

/** Copies chosen with one tap; any other number can be typed. */
const QUICK_COUNTS = [1, 10, 50, 100];

/** On-screen copy of the printed label, placed with the same layout numbers as the PDF. */
function LabelPreview({ product, code, size }: { product: Product; code: string; size: LabelSize }) {
  const L = LABEL_LAYOUT;
  const units = code39Bars(code).width;
  // The PDF caps narrow bars at 0.35 mm; the same cap as a share of the label width.
  const barsWidth = Math.min(L.barsMaxWidth, (units * 0.35) / size.width);
  const at = (top: number, fontSize?: number) =>
    ({ top: `${top * 100}%`, ...(fontSize && { fontSize: `${fontSize * 100}cqh` }) }) as React.CSSProperties;
  return (
    <div className="label-preview" style={{ aspectRatio: `${size.width} / ${size.height}`, padding: `0 ${L.side * 100}%` }}>
      <div className="label-line label-bold" style={at(L.brand.top, L.brand.size)}>
        {LABEL_BRAND}
      </div>
      <div className="label-line label-bold" style={at(L.name.top, L.name.size)}>
        {product.name.toUpperCase()}
      </div>
      <BarcodeSvg
        value={code}
        className="label-bars"
        style={{ top: `${L.bars.top * 100}%`, height: `${(L.bars.bottom - L.bars.top) * 100}%`, width: `${barsWidth * 100}%` }}
      />
      <div className="label-line label-code" style={at(L.code.top, L.code.size)}>
        {code}
      </div>
      <div className="label-rule" style={{ top: `${L.rule * 100}%`, left: `${L.side * 100}%`, right: `${L.side * 100}%` }} />
      <div className="label-foot" style={{ ...at(L.foot.top, L.foot.size), left: `${L.side * 100}%`, right: `${L.side * 100}%` }}>
        <span>{labelWeight(product.weight)}</span>
        <b>MRP: ₹{labelPrice(product.price)}</b>
      </div>
    </div>
  );
}

interface BarcodeModalProps {
  product: Product;
  onClose: () => void;
}

export function BarcodeModal({ product, onClose }: BarcodeModalProps) {
  const [copied, setCopied] = React.useState(false);
  const [sizeId, setSizeId] = React.useState<string>(LABEL_SIZES[0].id);
  const [count, setCount] = React.useState(1);
  const [working, setWorking] = React.useState(false);
  const [problem, setProblem] = React.useState('');
  const code = productBarcode(product);
  const size = LABEL_SIZES.find((s) => s.id === sizeId) ?? LABEL_SIZES[0];
  const copies = Math.max(1, Math.min(1000, Math.floor(count) || 1));
  const fileName = `labels-${code}-${copies}x-${size.id}.pdf`;

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function makePdf() {
    const bytes = await labelPdf({ name: product.name, weight: product.weight, price: product.price, code }, size, copies);
    return URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
  }

  async function download() {
    setWorking(true);
    setProblem('');
    try {
      const url = await makePdf();
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setProblem('The labels could not be made. Please try again.');
    } finally {
      setWorking(false);
    }
  }

  async function print() {
    // Opened straight away, while the click still counts, so the browser doesn't block it as a popup.
    const tab = window.open('', '_blank');
    setWorking(true);
    setProblem('');
    try {
      const url = await makePdf();
      if (tab) tab.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 10 * 60_000);
    } catch {
      tab?.close();
      setProblem('The labels could not be made. Please try again.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="product-modal barcode-modal"
        role="dialog"
        aria-label="Product barcode labels"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520 }}
      >
        <div className="modal-heading">
          <h2>Barcode labels</h2>
          <button type="button" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <LabelPreview product={product} code={code} size={size} />

        <div className="label-code-row">
          <button type="button" className="sticker-code-pill" onClick={copyCode} title="Copy barcode value">
            <code>{code}</code>
            {copied ? <Check size={12} color="#b8872c" /> : <Copy size={12} />}
          </button>
          <small>Each label is one page, cut to the sticker size.</small>
        </div>

        <div className="label-options">
          <label>
            Sticker size
            <select value={sizeId} onChange={(e) => setSizeId(e.target.value)}>
              {LABEL_SIZES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Number of labels
            <input
              type="number"
              min={1}
              max={1000}
              step={1}
              inputMode="numeric"
              value={count || ''}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>
          <div className="label-quick-counts" role="group" aria-label="Quick label counts">
            {QUICK_COUNTS.map((n) => (
              <button key={n} type="button" className={copies === n ? 'selected' : ''} onClick={() => setCount(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {problem && (
          <p className="error" role="alert">
            {problem}
          </p>
        )}

        <div className="modal-actions" style={{ justifyContent: 'space-between', marginTop: 16 }}>
          <button type="button" className="button outline" onClick={download} disabled={working} style={{ gap: 8 }}>
            <Download size={15} /> Download PDF ({copies})
          </button>
          <button type="button" className="button" onClick={print} disabled={working} style={{ gap: 8 }}>
            <Printer size={15} /> {working ? 'Preparing…' : `Print ${copies} label${copies === 1 ? '' : 's'}`}
          </button>
        </div>
        <p className="barcode-instructions">
          When printing, pick your label printer and set scale to 100% / Actual size so each sticker is filled exactly.
        </p>
      </section>
    </div>
  );
}
