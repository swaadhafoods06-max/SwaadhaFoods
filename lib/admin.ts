import { Product } from './products';

export const tabs = ['dashboard', 'pos', 'categories', 'products', 'banners', 'coupons', 'orders', 'reports', 'payments', 'team'] as const;
export type Tab = typeof tabs[number];
export const tabLabels: Record<Tab, string> = {
  dashboard: 'Dashboard',
  pos: 'POS Billing',
  categories: 'Categories',
  products: 'Products',
  banners: 'Hero banners',
  coupons: 'Coupons & offers',
  orders: 'Orders',
  reports: 'Analytics & reports',
  payments: 'Payments',
  team: 'Sub-admins & access',
};

export type Category = { id: string; name: string; description: string; enabled: boolean; image?: string };

export const defaultCategoryImages: Record<string, string> = {
  'Pickles': '/images/pickle.webp',
  'Snacks': '/images/banner-snacks.jpg',
  'Sweets': '/images/banner-sweets.jpg',
  'Pantry': '/images/banner-spices.jpg',
};

export function getCategoryImage(c: { name: string; image?: string | null }): string {
  if (c.image && c.image.trim()) return c.image.trim();
  return defaultCategoryImages[c.name] || '/images/hero.webp';
}
export type Member = { user_id: string; email: string; name: string; role: 'owner' | 'staff'; permissions: string[] };
/** A member being added or edited. `password` is only sent to the server, never stored in `admins`. */
export type MemberDraft = Member & { password?: string };

/** Sub-admin password rule, shared by the form and the server. Returns the problem, or '' when it is fine. */
export function passwordProblem(password: string) {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 72) return 'Password must be 72 characters or fewer.';
  if (!/[a-z]/i.test(password) || !/[0-9]/.test(password)) return 'Password must include at least one letter and one number.';
  return '';
}

/** A random 14-character password with letters, digits and a symbol, avoiding look-alike characters. */
export function generatePassword() {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = letters + digits + '!@#$%&*';
  const values = crypto.getRandomValues(new Uint32Array(14));
  const chars = Array.from(values, (v) => all[v % all.length]);
  chars[0] = letters[values[0] % letters.length];
  chars[1] = digits[values[1] % digits.length];
  chars[2] = '!@#$%&*'[values[2] % 7];
  return chars.join('');
}
export const statuses = ['pending', 'confirmed', 'preparing', 'dispatched', 'delivered', 'cancelled'] as const;

export type Order = {
  id: string;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  alt_phone?: string | null;
  address: string;
  requested_date: string;
  status: string;
  total: number;
  items: { product_id: string; name: string; quantity: number; price: number; weight: string }[];
  created_at: string;
  payment_method?: string;
  payment_status?: string;
  email?: string;
  city?: string;
  state?: string;
  pincode?: string;
  invoice_number?: string;
  shiprocket_order_id?: number | null;
  shipment_id?: number | null;
  awb_code?: string | null;
  courier_name?: string | null;
  tracking_url?: string | null;
  shipping_state?: string | null;
  inventory_reserved?: boolean;
  coupon_code?: string;
  discount?: number;
};

export type Banner = {
  mobile_image?: string;
  id: string;
  tag: string;
  title: string;
  em: string;
  text: string;
  image: string;
  label: string;
  href: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
};

export type Coupon = {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_discount: number | null;
  expiry_date: string | null;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
  created_at?: string;
};

export type Metrics = {
  total_orders: number;
  pending: number;
  order_value: number;
  active_products: number;
  daily: { day: string; orders: number; value: number }[];
  by_status: { status: string; count: number }[];
  top_products: { name: string; quantity: number; value: number }[];
};

export const money = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);

export function evaluateCoupon(coupon: Coupon, cartTotal: number): { valid: boolean; discount: number; message: string } {
  if (!coupon.is_active) {
    return { valid: false, discount: 0, message: 'This coupon is no longer active.' };
  }
  if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
    return { valid: false, discount: 0, message: 'This coupon has expired.' };
  }
  if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
    return { valid: false, discount: 0, message: 'This coupon has reached its maximum usage limit.' };
  }
  if (cartTotal < coupon.min_order_value) {
    const diff = coupon.min_order_value - cartTotal;
    return { valid: false, discount: 0, message: `Add ${money(diff)} more to apply this coupon (min order ${money(coupon.min_order_value)}).` };
  }
  let discount = 0;
  if (coupon.discount_type === 'percentage') {
    discount = Math.round((cartTotal * coupon.discount_value) / 100);
    if (coupon.max_discount && discount > coupon.max_discount) {
      discount = coupon.max_discount;
    }
  } else {
    discount = Math.min(coupon.discount_value, cartTotal);
  }
  return { valid: true, discount, message: `Coupon ${coupon.code} applied! Saved ${money(discount)}.` };
}

export function calculateMetrics(orders: Order[], products: Product[], from: string, to: string): Metrics {
  const selected = orders.filter(
    (o) =>
      new Date(o.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) >= from &&
      new Date(o.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) <= to
  );
  const daily: Metrics['daily'] = [];
  const top = new Map<string, { name: string; quantity: number; value: number }>();
  for (const o of selected) {
    const day = new Date(o.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    let row = daily.find((d) => d.day === day);
    if (!row) {
      row = { day, orders: 0, value: 0 };
      daily.push(row);
    }
    row.orders++;
    if (o.status !== 'cancelled') {
      row.value += Number(o.total);
      for (const item of o.items) {
        const p = top.get(item.name) ?? { name: item.name, quantity: 0, value: 0 };
        p.quantity += item.quantity;
        p.value += item.quantity * item.price;
        top.set(item.name, p);
      }
    }
  }
  return {
    total_orders: selected.length,
    pending: selected.filter((o) => o.status === 'pending').length,
    order_value: selected.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + Number(o.total), 0),
    active_products: products.filter((p) => p.available).length,
    daily: daily.sort((a, b) => a.day.localeCompare(b.day)),
    by_status: statuses.map((status) => ({ status, count: selected.filter((o) => o.status === status).length })),
    top_products: [...top.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10),
  };
}

export function serializeCsv(rows: (string | number)[][]) {
  return (
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((value) => {
            let s = String(value);
            if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
            return '"' + s.replaceAll('"', '""') + '"';
          })
          .join(',')
      )
      .join('\r\n')
  );
}

export function exportCsv(filename: string, rows: (string | number)[][]) {
  const csv = serializeCsv(rows);
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
