'use client';
import { Plus, RefreshCw } from 'lucide-react';
import { tabLabels } from '@/lib/admin';
import { useAdmin } from './context';
import { defaultBanner, defaultCoupon, defaultProduct, pageIntros } from './config';

/** Page title, intro line, and the page's "Add …" button (plus "Update old SKUs" on Products). */
export function AdminPageHeading() {
  const {
    tab,
    member,
    busy,
    categories,
    banners,
    oldSkuCount,
    updateOldSkus,
    setProductEdit,
    setCategoryEdit,
    setBannerEdit,
    setCouponEdit,
    setMemberEdit,
  } = useAdmin();

  return (
    <div className="admin-page-heading">
      <div>
        <div className="eyebrow">{tab === 'dashboard' ? 'A LITTLE OVERVIEW. A LOT OF POSSIBILITIES.' : 'YOUR KITCHEN, BEAUTIFULLY ORGANIZED.'}</div>
        <h1>
          {tab === 'dashboard' ? `Hello, ${member?.name.split(' ')[0]}.` : tabLabels[tab]}
          <span className="heading-dot">✳</span>
        </h1>
        <p>{pageIntros[tab]}</p>
      </div>

      {tab === 'products' && (
        <div className="modal-actions">
          {oldSkuCount > 0 && (
            <button className="button outline" onClick={updateOldSkus} disabled={busy} title="Give older products an SW-MNG001 SKU and barcode">
              <RefreshCw size={16} /> Update {oldSkuCount} old SKU{oldSkuCount === 1 ? '' : 's'}
            </button>
          )}
          <button
            className="button"
            onClick={() => setProductEdit({ ...defaultProduct, category: categories[0]?.name || '' })}
            disabled={!categories.length}
          >
            <Plus size={17} /> Add product
          </button>
        </div>
      )}
      {tab === 'categories' && (
        <button className="button" onClick={() => setCategoryEdit({ name: '', description: '', enabled: true })}>
          <Plus size={17} /> Add category
        </button>
      )}
      {tab === 'banners' && (
        <button className="button" onClick={() => setBannerEdit({ ...defaultBanner, display_order: banners.length + 1 })}>
          <Plus size={17} /> Add hero banner
        </button>
      )}
      {tab === 'coupons' && (
        <button className="button" onClick={() => setCouponEdit({ ...defaultCoupon })}>
          <Plus size={17} /> Add coupon
        </button>
      )}
      {tab === 'team' && (
        <button className="button" onClick={() => setMemberEdit({ user_id: '', name: '', email: '', role: 'staff', permissions: [] })}>
          <Plus size={17} /> Add sub-admin
        </button>
      )}
    </div>
  );
}
