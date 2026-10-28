import { BarChart3, Image as ImageIcon, LayoutDashboard, Package, ShoppingBag, Store, Tags, Ticket, Users } from 'lucide-react';
import { Banner, Coupon, Metrics, Tab, tabLabels } from '@/lib/admin';
import { Product } from '@/lib/products';

/** Sidebar menu, in display order. */
export const navigation = [
  { id: 'dashboard', label: tabLabels.dashboard, icon: LayoutDashboard },
  { id: 'pos', label: tabLabels.pos, icon: Store },
  { id: 'categories', label: tabLabels.categories, icon: Tags },
  { id: 'products', label: tabLabels.products, icon: Package },
  { id: 'banners', label: tabLabels.banners, icon: ImageIcon },
  { id: 'coupons', label: tabLabels.coupons, icon: Ticket },
  { id: 'orders', label: tabLabels.orders, icon: ShoppingBag },
  { id: 'reports', label: tabLabels.reports, icon: BarChart3 },
  { id: 'team', label: tabLabels.team, icon: Users },
] as const;

/** The line under each page title. */
export const pageIntros: Record<Tab, string> = {
  dashboard: 'Here’s what’s cooking in your business.',
  pos: 'Quick counter billing, barcode scanning, cash tender & instant receipts.',
  categories: 'Give every homemade favorite a place to belong.',
  products: 'Your recipes. Your prices. Your beautiful kitchen menu.',
  banners: 'Hero carousel and promotional images across your storefront.',
  coupons: 'Discount codes and promotional offers for your customers.',
  orders: 'From a little craving to a happy delivery.',
  reports: 'A clearer picture of your kitchen, ready to download.',
  team: 'The right tabs for the right people.',
};

/** A record being created (no id yet) or edited. */
export type Draft<T extends { id: string }> = Omit<T, 'id'> & { id?: string };

export const emptyMetrics: Metrics = {
  total_orders: 0,
  pending: 0,
  order_value: 0,
  active_products: 0,
  daily: [],
  by_status: [],
  top_products: [],
};

export const defaultProduct: Draft<Product> = {
  name: '',
  category: 'Pickles',
  description: '',
  price: 0,
  weight: '250 g',
  image: '',
  available: true,
  stock: 0,
  sku: '',
  barcode: '',
  long_description: '',
  ingredients: '',
  allergens: '',
  shelf_life: '',
  storage: '',
  net_weight_grams: 250,
};

export const defaultBanner: Draft<Banner> = {
  mobile_image: "",
  tag: 'THE SWAADHA FAMILY KITCHEN',
  title: '',
  em: '',
  text: '',
  image: '',
  label: '',
  href: '/products',
  display_order: 1,
  is_active: true,
};

export const defaultCoupon: Draft<Coupon> = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 10,
  min_order_value: 0,
  max_discount: null,
  expiry_date: null,
  usage_limit: null,
  times_used: 0,
  is_active: true,
};

/** Today's date in India, as YYYY-MM-DD. */
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

/** The start of the default 30-day report window. */
export function startDate() {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}
