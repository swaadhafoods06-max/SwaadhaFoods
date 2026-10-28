'use client';
import { ResponsiveRecords } from '@/components/admin/responsive-records';
import { useState } from 'react';
import { Barcode, Pencil, Search, Trash2 } from 'lucide-react';
import { useAdmin } from '@/components/admin/context';
import { money } from '@/lib/admin';

export default function ProductsPage() {
  const {
    busy,
    deleteProduct,
    matchedProducts,
    openProduct,
    products,
    query,
    setBarcodeModalProduct,
    setQuery,
    toggleProduct,
  } = useAdmin();
  const [category,setCategory]=useState('');
  const [minPrice,setMinPrice]=useState(''),[maxPrice,setMaxPrice]=useState(''),[stockFilter,setStockFilter]=useState('');
  const filteredProducts=matchedProducts.filter(p=>(!category||p.category===category)&&(!minPrice||p.price>=Number(minPrice))&&(!maxPrice||p.price<=Number(maxPrice))&&(!stockFilter||(stockFilter==='in'?(p.stock??0)>0:stockFilter==='low'?(p.stock??0)>0&&(p.stock??0)<5:(p.stock??0)<=0)));
  const invalidPrice=!!minPrice&&!!maxPrice&&Number(minPrice)>Number(maxPrice);
  return (
    <>
      <title>Products · Kitchen admin | Swaadha</title>
      <div className="listing-toolbar">
        <span>{products.length} products in your kitchen</span>
        <label className="search">
          <Search size={16} />
          <input
            aria-label="Search products"
            placeholder="Search name, category, SKU, or barcode"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="admin-product-filters">
        <label>Category<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">All categories</option>{[...new Set(products.map(p=>p.category))].sort().map(c=><option key={c}>{c}</option>)}</select></label>
        <label>Min price (₹)<input type="number" min="0" value={minPrice} onChange={e=>setMinPrice(e.target.value)} placeholder="0"/></label>
        <label>Max price (₹)<input type="number" min="0" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} placeholder="Any"/></label>
        <label>Stock<select value={stockFilter} onChange={e=>setStockFilter(e.target.value)}><option value="">All stock</option><option value="in">In stock</option><option value="low">Low stock (1–4)</option><option value="out">Out of stock</option></select></label>
        <button type="button" className="button outline" onClick={()=>{setCategory('');setMinPrice('');setMaxPrice('');setStockFilter('');setQuery('')}}>Reset filters</button>
      </div>
      {invalidPrice&&<p className="error" role="alert">Maximum price must be at least the minimum price.</p>}
      <p className="table-help" role="status">{filteredProducts.length} matching products</p>
      <div className="admin-box-list">
        <div className="admin-box-container">
          
          <ResponsiveRecords>
            {filteredProducts.map((p) => (
              <article className="admin-record-box" key={p.id}>
                <div className="admin-record-field" data-label="Product">
                  <div className="table-product">
                    <img
                      src={p.image}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.src = '/images/hero.webp';
                      }}
                    />
                    <div>
                      <b>{p.name}</b>
                      <small>{p.weight}</small>
                    </div>
                  </div>
                </div>
                <div className="admin-record-field" data-label="Category">{p.category}</div>
                <div className="admin-record-field" data-label="Price">{money(p.price)}</div>
                <div className="admin-record-field" data-label="Stock">
                  <span className={`stock-indicator ${(p.stock ?? 0) < 5 ? 'low' : ''}`}>{p.stock ?? 0} packs</span>
                </div>
                <div className="admin-record-field" data-label="Visibility">
                  <button
                    disabled={busy}
                    className={`status ${p.available ? 'available' : ''}`}
                    onClick={() => toggleProduct(p)}
                  >
                    {p.available ? 'Available' : 'Hidden'}
                  </button>
                </div>
                <div className="admin-record-field" data-label="Action">
                  <div className="order-list-actions">
                    <button
                      className="table-action"
                      title="Print Barcode Label"
                      onClick={() => setBarcodeModalProduct(p)}
                    >
                      <Barcode size={14} /> Barcode
                    </button>
                    <button className="table-action" aria-label={`Edit ${p.name}`} onClick={() => openProduct(p)}>
                      <Pencil size={15} /> Edit
                    </button>
                    <button className="table-action" aria-label={`Delete ${p.name}`} onClick={() => deleteProduct(p)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </ResponsiveRecords>
        </div>
        {!filteredProducts.length && <p className="empty">No products found. Add a favorite to get started.</p>}
      </div>
      <p className="table-help">Hide products to remove them from the storefront. Products in hidden categories are also hidden.</p>
    </>
  );
}
