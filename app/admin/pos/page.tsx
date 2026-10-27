'use client';
import { useEffect, useRef, useState } from 'react';
import { Barcode, Camera, CheckCircle2, Receipt, Trash2, X } from 'lucide-react';
import { useAdmin } from '@/components/admin/context';
import { CameraScanner } from '@/components/admin/camera-scanner';
import { today } from '@/components/admin/config';
import { money } from '@/lib/admin';

export default function PosPage() {
  const {
    addScannedToPosCart,
    posLastAdded,
    productForCode,
    addToPosCart,
    busy,
    categories,
    completePosOrder,
    handlePosBarcodeKeydown,
    posCart,
    posCashTendered,
    posCategory,
    posChangeReturn,
    posCustomerName,
    posCustomerPhone,
    posDiscount,
    posGrandTotal,
    posPaymentMethod,
    posSearch,
    posSubtotal,
    products,
    removeFromPosCart,
    setPosCart,
    setPosCashTendered,
    setPosCategory,
    setPosCustomerName,
    setPosCustomerPhone,
    setPosDiscount,
    setPosPaymentMethod,
    setPosSearch,
    updatePosQty,
  } = useAdmin();
  const [cameraOpen, setCameraOpen] = useState(false);
  const billList = useRef<HTMLDivElement>(null);
  const lastLine = posLastAdded && posCart.find((l) => l.product.id === posLastAdded.id);

  // Bring the line that was just added into view in the bill.
  useEffect(() => {
    if (!posLastAdded) return;
    billList.current
      ?.querySelector(`[data-bill-item="${posLastAdded.id}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [posLastAdded]);
  return (
    <>
      <title>POS Billing · Kitchen admin | Swaadha</title>
      <div className="pos-layout">
        {/* Left: Product Catalog */}
        <div className="pos-catalog-panel">
          <div className="pos-toolbar">
            <div className="pos-scan-input">
              <Barcode size={18} color="#c8202a" />
              <input
                type="text"
                placeholder="Scan barcode or type name / SKU then hit [Enter]..."
                value={posSearch}
                onChange={(e) => setPosSearch(e.target.value)}
                onKeyDown={handlePosBarcodeKeydown}
                autoFocus
              />
              {posSearch && (
                <button type="button" onClick={() => setPosSearch('')} style={{ cursor: 'pointer', opacity: 0.5 }}>
                  <X size={15} />
                </button>
              )}
              <button type="button" className="pos-camera-button" aria-label="Scan a barcode with the camera" onClick={() => setCameraOpen(true)}>
                <Camera size={17} /> <span>Scan</span>
              </button>
            </div>
            {cameraOpen && (
              <CameraScanner
                onClose={() => setCameraOpen(false)}
                isKnown={(code) => !!productForCode(code)}
                onScan={(code) => {
                  const product = addScannedToPosCart(code);
                  return product
                    ? { ok: true, message: `Added ${product.name}`, item: product.name }
                    : { ok: false, message: `No product for ${code}` };
                }}
              />
            )}
            <div className="pos-category-pills">
              {['All', ...categories.map((c) => c.name)].map((cName) => (
                <button
                  key={cName}
                  type="button"
                  className={posCategory === cName ? 'selected' : ''}
                  onClick={() => setPosCategory(cName)}
                >
                  {cName}
                </button>
              ))}
            </div>
          </div>

          <div className="pos-grid">
            {products
              .filter(
                (p) =>
                  p.available &&
                  (posCategory === 'All' || p.category === posCategory) &&
                  (!posSearch ||
                    `${p.name} ${p.category} ${p.sku || ''} ${p.barcode || ''}`
                      .toLowerCase()
                      .includes(posSearch.toLowerCase()))
              )
              .map((p) => {
                const inCart = posCart.find((i) => i.product.id === p.id);
                return (
                  <div
                    key={p.id + (posLastAdded?.id === p.id ? posLastAdded.at : '')}
                    className={`pos-card ${posLastAdded?.id === p.id ? 'just-added' : ''}`}
                    onClick={() => addToPosCart(p)}
                    title={`Click to add ${p.name} to bill`}
                  >
                    <img
                      src={p.image}
                      alt={p.name}
                      className="pos-card-img"
                      onError={(e) => {
                        e.currentTarget.src = '/images/hero.webp';
                      }}
                    />
                    <h4>{p.name}</h4>
                    <div className="pos-card-meta">
                      {p.weight} · <span style={{ color: (p.stock ?? 0) <= 5 ? '#c8202a' : '#8c6420' }}>
                        {p.stock ?? 0} in stock
                      </span>
                    </div>
                    <div className="pos-card-footer">
                      <span className="pos-card-price">{money(p.price)}</span>
                      <span className="pos-card-add-btn">
                        {inCart ? `+ Add (${inCart.quantity})` : '+ Add'}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Right: Current Register Bill */}
        <div className="pos-bill-panel">
          <div className="pos-bill-header">
            <div>
              <h3>Current Register Bill</h3>
              <small style={{ color: 'var(--ink-mute)' }}>Counter 01 · {today()}</small>
            </div>
            {posCart.length > 0 && (
              <button
                type="button"
                className="table-action"
                style={{ color: 'var(--red)' }}
                onClick={() => setPosCart([])}
              >
                <Trash2 size={13} /> Clear
              </button>
            )}
          </div>

          <div className="pos-customer-row">
            <input
              type="text"
              placeholder="Customer Name"
              value={posCustomerName}
              onChange={(e) => setPosCustomerName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Mobile No. (optional)"
              value={posCustomerPhone}
              onChange={(e) => setPosCustomerPhone(e.target.value)}
            />
          </div>

          <div className="pos-items-scroll" ref={billList}>
            {!posCart.length ? (
              <p style={{ textAlign: 'center', color: 'var(--ink-mute)', padding: '30px 10px', fontSize: 12 }}>
                No items in bill yet.<br />Click products on the left or scan barcode.
              </p>
            ) : (
              posCart.map(({ product: p, quantity }) => (
                <div
                  key={p.id + (posLastAdded?.id === p.id ? posLastAdded.at : '')}
                  data-bill-item={p.id}
                  className={`pos-bill-item ${posLastAdded?.id === p.id ? 'just-added' : ''}`}
                >
                  <div className="pos-item-info">
                    <span className="pos-item-name">{p.name}</span>
                    <span className="pos-item-rate">{money(p.price)} / {p.weight}</span>
                  </div>
                  <div className="pos-item-qty">
                    <button type="button" onClick={() => updatePosQty(p.id, -1)}>-</button>
                    <span style={{ minWidth: 16, textAlign: 'center', fontWeight: 600 }}>{quantity}</span>
                    <button type="button" onClick={() => updatePosQty(p.id, 1)}>+</button>
                  </div>
                  <span className="pos-item-total">{money(p.price * quantity)}</span>
                  <button
                    type="button"
                    className="pos-item-del"
                    onClick={() => removeFromPosCart(p.id)}
                    title="Remove"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="pos-totals-row">
            <span>Subtotal</span>
            <b>{money(posSubtotal)}</b>
          </div>

          <div className="pos-totals-row" style={{ alignItems: 'center' }}>
            <span>Discount (₹)</span>
            <input
              type="number"
              min="0"
              max={posSubtotal}
              value={posDiscount || ''}
              placeholder="0"
              onChange={(e) => setPosDiscount(Math.max(0, Number(e.target.value) || 0))}
              style={{ width: 80, padding: '3px 8px', border: '1px solid var(--line)', borderRadius: 4, textAlign: 'right', fontSize: 11 }}
            />
          </div>

          <div className="pos-grand-total">
            <span>Total Payable</span>
            <strong>{money(posGrandTotal)}</strong>
          </div>

          {/* Payment Method Selection */}
          <div style={{ marginTop: 14 }}>
            <small style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-mute)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Payment Method
            </small>
            <div className="pos-payment-selector">
              {(['Cash', 'UPI', 'Card', 'Pay Later'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={posPaymentMethod === mode ? 'selected' : ''}
                  onClick={() => setPosPaymentMethod(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Cash Change Calculator */}
          {posPaymentMethod === 'Cash' && (
            <div className="pos-cash-calculator">
              <div className="pos-cash-tender-row">
                <label style={{ fontSize: 11, color: 'var(--red-900)' }}>Cash Received (₹):</label>
                <input
                  type="number"
                  placeholder={String(posGrandTotal)}
                  value={posCashTendered}
                  onChange={(e) => setPosCashTendered(e.target.value)}
                />
              </div>
              <div className="pos-quick-cash">
                {[posGrandTotal, 100, 200, 500, 1000, 2000]
                  .filter((v, i, a) => v >= posGrandTotal && a.indexOf(v) === i)
                  .slice(0, 4)
                  .map((val) => (
                    <button key={val} type="button" onClick={() => setPosCashTendered(String(val))}>
                      ₹{val}
                    </button>
                  ))}
              </div>
              <div className="pos-change-box">
                <span>Change to Return:</span>
                <span>{money(posChangeReturn)}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            className="pos-checkout-btn"
            disabled={busy || !posCart.length}
            onClick={completePosOrder}
          >
            <Receipt size={17} /> Complete Sale & Print Bill ({money(posGrandTotal)})
          </button>
        </div>
      </div>
      {lastLine && !cameraOpen && (
        <div key={posLastAdded!.at} className="pos-added-toast" role="status">
          <CheckCircle2 size={18} />
          <span>
            <b>{lastLine.product.name}</b> added · {lastLine.quantity} in bill
          </span>
          <span className="pos-added-total">{money(posGrandTotal)}</span>
        </div>
      )}
    </>
  );
}
