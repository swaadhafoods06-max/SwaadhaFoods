'use client';
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
      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Visibility</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {matchedProducts.map((p) => (
              <tr key={p.id}>
                <td>
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
                </td>
                <td>{p.category}</td>
                <td>{money(p.price)}</td>
                <td>
                  <span className={`stock-indicator ${(p.stock ?? 0) < 5 ? 'low' : ''}`}>{p.stock ?? 0} packs</span>
                </td>
                <td>
                  <button
                    disabled={busy}
                    className={`status ${p.available ? 'available' : ''}`}
                    onClick={() => toggleProduct(p)}
                  >
                    {p.available ? 'Available' : 'Hidden'}
                  </button>
                </td>
                <td>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!matchedProducts.length && <p className="empty">No products found. Add a favorite to get started.</p>}
      </div>
      <p className="table-help">Hide products to remove them from the storefront. Products in hidden categories are also hidden.</p>
    </>
  );
}
