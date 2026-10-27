'use client';

import React from 'react';
import { Download, Printer, X, Copy, Check } from 'lucide-react';
import { money } from '@/lib/admin';
import { MAX_LABEL_CODE_LENGTH, skuBarcode, type Product } from '@/lib/products';

// Standard Code 39 Encoding Table (9 elements: 5 bars, 4 spaces, exactly 3 wide)
const CODE39: Record<string, string> = {
  '0': 'NNNWWNWNN', '1': 'WNNWNNNNW', '2': 'NNWWNNNNW', '3': 'WNWWNNNNN',
  '4': 'NNNWWNNNW', '5': 'WNNWWNNNN', '6': 'NNWWWNNNN', '7': 'NNNWNNWNW',
  '8': 'WNNWNNWNN', '9': 'NNWWNNWNN', 'A': 'WNNNNWNNW', 'B': 'NNWNNWNNW',
  'C': 'WNWNNWNNN', 'D': 'NNNNWWNNW', 'E': 'WNNNWWNNN', 'F': 'NNWNWWNNN',
  'G': 'NNNNNWWNW', 'H': 'WNNNNWWNN', 'I': 'NNWNNWWNN', 'J': 'NNNNWWWNN',
  'K': 'WNNNNNNWW', 'L': 'NNWNNNNWW', 'M': 'WNWNNNNWN', 'N': 'NNNNWNNWW',
  'O': 'WNNNWNNWN', 'P': 'NNWNWNNWN', 'Q': 'NNNNNNWWW', 'R': 'WNNNNNWWN',
  'S': 'NNWNNNWWN', 'T': 'NNNNWNWWN', 'U': 'WWNNNNNNW', 'V': 'NWWNNNNNW',
  'W': 'WWWNNNNNN', 'X': 'NWNNWNNNW', 'Y': 'WWNNWNNNN', 'Z': 'NWWNWNNNN',
  '-': 'NWNNNNWNW', '.': 'WWNNNNNWN', ' ': 'NWWNNNWNN', '*': 'NWNNWNWNN',
  '$': 'NWNWNWNNN', '/': 'NWNWNNNWN', '+': 'NWNNNWNWN', '%': 'NNNWNWNWN'
};

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

interface BarcodeSvgProps {
  value: string;
  height?: number;
  barWidth?: number;
  showText?: boolean;
  className?: string;
}

export function BarcodeSvg({
  value,
  height = 54,
  barWidth = 1.8,
  showText = true,
  className = '',
}: BarcodeSvgProps) {
  const clean = cleanBarcodeValue(value);
  const fullText = `*${clean}*`;

  const wideRatio = 2.6;
  const narrowWidth = barWidth;
  const wideWidth = barWidth * wideRatio;
  const gapWidth = narrowWidth;

  const rects: { x: number; width: number; isBar: boolean }[] = [];
  let currentX = narrowWidth * 10; // quiet zone (Code 39 minimum is 10 narrow widths)

  for (let i = 0; i < fullText.length; i++) {
    const ch = fullText[i];
    const pattern = CODE39[ch] || CODE39['-'];

    for (let p = 0; p < 9; p++) {
      const isBar = p % 2 === 0;
      const isWide = pattern[p] === 'W';
      const w = isWide ? wideWidth : narrowWidth;

      if (isBar) {
        rects.push({ x: currentX, width: w, isBar: true });
      }
      currentX += w;
    }
    // Inter-character space
    currentX += gapWidth;
  }

  currentX += narrowWidth * 10; // trailing quiet zone
  const totalWidth = Math.ceil(currentX);
  const totalHeight = height + (showText ? 18 : 0);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      width={totalWidth}
      height={totalHeight}
      className={className}
      style={{ display: 'block', margin: '0 auto', background: '#ffffff', borderRadius: 4 }}
    >
      {rects.map((r, idx) => (
        <rect
          key={idx}
          x={r.x}
          y={4}
          width={r.width}
          height={height}
          fill="#111111"
        />
      ))}
      {showText && (
        <text
          x={totalWidth / 2}
          y={height + 16}
          textAnchor="middle"
          fill="#333333"
          fontSize="11"
          fontFamily="monospace"
          fontWeight="600"
          letterSpacing="2"
        >
          {clean}
        </text>
      )}
    </svg>
  );
}

interface BarcodeModalProps {
  product: Product;
  onClose: () => void;
}

export function BarcodeModal({ product, onClose }: BarcodeModalProps) {
  const [copied, setCopied] = React.useState(false);
  const barcodeVal = productBarcode(product);

  function copyCode() {
    navigator.clipboard.writeText(barcodeVal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePrint() {
    const printWindow = window.open('', '_blank', 'width=500,height=400');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode - ${product.name}</title>
        <style>
          @page { size: 60mm 40mm; margin: 3mm; }
          body {
            font-family: 'DM Sans', -apple-system, Arial, sans-serif;
            margin: 0;
            padding: 4mm;
            text-align: center;
            background: #fff;
            color: #111;
          }
          .brand { font-size: 8px; letter-spacing: 1.5px; font-weight: 700; text-transform: uppercase; color: #c8202a; margin-bottom: 2px; }
          .name { font-size: 11px; font-weight: 700; line-height: 1.2; margin: 2px 0; max-height: 24px; overflow: hidden; }
          .meta { font-size: 9px; color: #555; margin-bottom: 4px; }
          .price { font-size: 13px; font-weight: 800; color: #c8202a; margin-top: 2px; }
          .barcode-container { margin: 4px auto; }
          svg { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        <div class="brand">SWAADHA KITCHEN</div>
        <div class="name">${product.name}</div>
        <div class="meta">${product.category} · ${product.weight}</div>
        <div class="barcode-container">
          ${document.getElementById('barcode-render-box')?.innerHTML || ''}
        </div>
        <div class="price">MRP ${money(product.price)}</div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  function downloadSvg() {
    const svgEl = document.querySelector('#barcode-render-box svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const link = document.createElement('a');
    link.href = svgUrl;
    link.download = `barcode-${product.sku || product.name.toLowerCase().replace(/\s+/g, '-')}.svg`;
    link.click();
    URL.revokeObjectURL(svgUrl);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="product-modal barcode-modal"
        role="dialog"
        aria-label="Product Barcode Label"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 460 }}
      >
        <div className="modal-heading">
          <h2>Product Barcode</h2>
          <button type="button" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="barcode-sticker-card">
          <div className="sticker-header">
            <span className="sticker-brand">THE SWAADHA KITCHEN</span>
            <span className="sticker-category">{product.category}</span>
          </div>

          <h3 className="sticker-title">{product.name}</h3>
          <p className="sticker-weight">Net Wt: {product.weight} {product.sku ? `· SKU: ${product.sku}` : ''}</p>

          <div id="barcode-render-box" className="sticker-barcode-wrap">
            <BarcodeSvg value={barcodeVal} height={56} barWidth={1.8} />
          </div>

          <div className="sticker-footer">
            <div className="sticker-code-pill" onClick={copyCode} title="Click to copy barcode value">
              <code>{barcodeVal}</code>
              {copied ? <Check size={12} color="#b8872c" /> : <Copy size={12} />}
            </div>
            <strong className="sticker-price">{money(product.price)}</strong>
          </div>
        </div>

        <p className="barcode-instructions">
          Scannable with any standard 1D laser or optical barcode scanner at POS checkout.
        </p>

        <div className="modal-actions" style={{ justifyContent: 'space-between', marginTop: 20 }}>
          <button type="button" className="button outline" onClick={downloadSvg} style={{ gap: 8 }}>
            <Download size={15} /> Download SVG
          </button>
          <button type="button" className="button" onClick={handlePrint} style={{ gap: 8 }}>
            <Printer size={15} /> Print Label Sticker
          </button>
        </div>
      </section>
    </div>
  );
}
