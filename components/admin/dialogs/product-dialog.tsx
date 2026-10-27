'use client';
import { useState } from 'react';
import { Check, Upload, Wand2 } from 'lucide-react';
import { generateSku, MAX_LABEL_CODE_LENGTH, skuBarcode } from '@/lib/products';
import { productBarcode } from '../barcode';
import { Modal } from '../modal';
import { useAdmin } from '../context';

/** Add or edit a product. */
export function ProductDialog() {
  const { productEdit } = useAdmin();
  // Mounted fresh each time the dialog opens, so the SKU auto-fill starts over.
  return productEdit ? <ProductForm /> : null;
}

function ProductForm() {
  const {
    productEdit,
    busy,
    categories,
    error,
    handleFileUpload,
    products,
    saveProduct,
    setProductEdit,
    uploadingImage,
  } = useAdmin();
  const draft = productEdit!;
  // New products (and old ones without a SKU) get their SKU from the name until it's typed by hand.
  const [skuAuto, setSkuAuto] = useState(!draft.id || !draft.sku?.trim());
  if (!productEdit) return null;

  const others = products.filter((p) => p.id !== productEdit.id);
  const otherSkus = others.map((p) => p.sku);
  const sku = productEdit.sku?.trim() ?? '';
  // The barcode label is made from the SKU, so it must be unique and short enough to scan.
  const skuWarning = !sku
    ? ''
    : otherSkus.some((s) => s?.trim().toUpperCase() === sku.toUpperCase()) || others.map(productBarcode).includes(skuBarcode(sku))
      ? 'Another product already uses this SKU. Press Auto for a new one.'
      : skuBarcode(sku).length > MAX_LABEL_CODE_LENGTH
        ? `Too long for a barcode label. Keep it to ${MAX_LABEL_CODE_LENGTH} characters or press Auto.`
        : '';

  function changeName(name: string) {
    setProductEdit({ ...productEdit!, name, ...(skuAuto && { sku: generateSku(name, otherSkus) }) });
  }

  return (
    <Modal title={productEdit.id ? 'Edit product' : 'Add a favorite'} onClose={() => setProductEdit(null)}>
      <form onSubmit={saveProduct}>
        <div className="form-row">
          <label>
            Product name
            <input
              required
              maxLength={120}
              value={productEdit.name}
              onChange={(e) => changeName(e.target.value)}
            />
          </label>
          <label>
            Category
            <select
              value={productEdit.category}
              onChange={(e) => setProductEdit({ ...productEdit, category: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            Price (₹)
            <input
              required
              type="number"
              min={0}
              step="0.01"
              value={productEdit.price || ''}
              onChange={(e) => setProductEdit({ ...productEdit, price: Number(e.target.value) })}
            />
          </label>
          <label>
            Weight / pack
            <input
              required
              placeholder="e.g. 250 g"
              value={productEdit.weight}
              onChange={(e) => setProductEdit({ ...productEdit, weight: e.target.value })}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Available stock (packs)
            <input
              required
              type="number"
              min={0}
              step={1}
              value={productEdit.stock ?? 0}
              onChange={(e) => setProductEdit({ ...productEdit, stock: Number(e.target.value) })}
            />
          </label>
          <label>
            SKU (Item code)
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                maxLength={50}
                placeholder="Fills in as you type the name"
                value={productEdit.sku ?? ''}
                onChange={(e) => {
                  setSkuAuto(false);
                  setProductEdit({ ...productEdit, sku: e.target.value });
                }}
              />
              <button
                type="button"
                className="button outline"
                style={{ padding: '0 12px', fontSize: 11, whiteSpace: 'nowrap', borderRadius: 6 }}
                title="Make the SKU from the product name"
                disabled={!productEdit.name.trim()}
                onClick={() => {
                  setSkuAuto(true);
                  setProductEdit({ ...productEdit, sku: generateSku(productEdit.name, otherSkus) });
                }}
              >
                <Wand2 size={14} /> Auto
              </button>
            </div>
            <small
              style={{
                color: skuWarning ? 'var(--red)' : 'var(--ink-mute)',
                fontSize: 11,
                fontWeight: skuWarning ? 700 : 400,
                textTransform: 'none',
                letterSpacing: 0,
              }}
            >
              {skuWarning ||
                (skuAuto
                  ? 'Auto: SW + 3 letters of the name + next number. The barcode label is made from this SKU.'
                  : 'Typed by hand. Press Auto to make it from the name. The barcode label is made from this SKU.')}
            </small>
          </label>
        </div>
        <label>
          Short description
          <textarea
            required
            maxLength={1000}
            value={productEdit.description}
            onChange={(e) => setProductEdit({ ...productEdit, description: e.target.value })}
          />
        </label>

        {/* Product Image URL + Direct Storage Upload */}
        <label>
          Image URL
          <input
            required
            type="text"
            placeholder="https://… or upload below"
            value={productEdit.image}
            onChange={(e) => setProductEdit({ ...productEdit, image: e.target.value })}
          />
        </label>
        <div className="storage-uploader-box">
          <label className="upload-btn-label">
            <Upload size={14} /> {uploadingImage ? 'Uploading to Supabase…' : 'Upload photo to products bucket'}
            <input
              type="file"
              accept="image/*"
              disabled={uploadingImage}
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f, 'products', (url) => setProductEdit((prev) => (prev ? { ...prev, image: url } : null)));
              }}
            />
          </label>
          {productEdit.image && (
            <img src={productEdit.image} alt="Preview" style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 4 }} />
          )}
        </div>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={productEdit.available}
            onChange={(e) => setProductEdit({ ...productEdit, available: e.target.checked })}
          />{' '}
          Show on the storefront
        </label>

        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="button modal-save" disabled={busy || uploadingImage}>
          <Check size={17} /> Save product
        </button>
      </form>
    </Modal>
  );
}
