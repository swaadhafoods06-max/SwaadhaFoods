-- =====================================================================
-- SWAADHA KITCHEN — ALL-IN-ONE SUPABASE SETUP SCRIPT (100% COMPLETE)
-- Project: https://ykpqtlkhkiwjknqaiwoz.supabase.co
--
-- How to run:
-- 1. Open Supabase Dashboard -> SQL Editor (https://supabase.com/dashboard/project/ykpqtlkhkiwjknqaiwoz/sql)
-- 2. Click "New Query", paste this entire file, and click "Run" (Cmd+Enter).
-- =====================================================================

begin;

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- =====================================================================
-- 1. ADMINS TABLE & PERMISSIONS (CREATED FIRST)
-- =====================================================================
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Kitchen admin',
  email text not null default '',
  role text not null default 'owner' check (role in ('owner','staff')),
  permissions text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Ensure columns exist if table was partially created
alter table public.admins add column if not exists name text not null default 'Kitchen admin';
alter table public.admins add column if not exists email text not null default '';
alter table public.admins add column if not exists role text not null default 'owner' check (role in ('owner','staff'));
alter table public.admins add column if not exists permissions text[] not null default '{}';
alter table public.admins add column if not exists created_at timestamptz not null default now();

alter table public.admins enable row level security;

-- Function has_tab (defined AFTER public.admins exists)
create or replace function public.has_tab(tab_name text) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(
   select 1 from public.admins a 
   where a.user_id = auth.uid() 
     and (
       a.role = 'owner' 
       or (
         tab_name in ('dashboard','pos','categories','products','banners','coupons','orders','reports') 
         and tab_name = any(a.permissions)
       )
     )
 );
$$;
revoke all on function public.has_tab(text) from public;
grant execute on function public.has_tab(text) to anon, authenticated;

drop policy if exists "Admins can read own membership" on public.admins;
drop policy if exists "Staff membership visibility" on public.admins;
create policy "Staff membership visibility" on public.admins
for select to authenticated
using (user_id = auth.uid() or public.has_tab('team'));

grant select on public.admins to authenticated;

-- =====================================================================
-- 2. CATEGORIES TABLE
-- =====================================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null check (char_length(name) between 1 and 80),
  description text not null default '',
  image text not null default '',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.categories add column if not exists description text not null default '';
alter table public.categories add column if not exists image text not null default '';
alter table public.categories add column if not exists enabled boolean not null default true;
alter table public.categories add column if not exists created_at timestamptz not null default now();

alter table public.categories enable row level security;

drop policy if exists "Read categories" on public.categories;
create policy "Read categories" on public.categories
for select to anon, authenticated
using (enabled or public.has_tab('categories') or public.has_tab('products'));

drop policy if exists "Manage categories" on public.categories;
create policy "Manage categories" on public.categories
for all to authenticated
using (public.has_tab('categories'))
with check (public.has_tab('categories'));

grant select on public.categories to anon;
grant select, insert, update, delete on public.categories to authenticated;

insert into public.categories (name, description)
values
  ('Pickles', 'Bold, tangy family favorites.'),
  ('Snacks', 'A little crunch for every craving.'),
  ('Sweets', 'A sweet little celebration.'),
  ('Pantry', 'Everyday flavor, made at home.')
on conflict (name) do nothing;

-- =====================================================================
-- 3. PRODUCTS TABLE
-- =====================================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  category text not null references public.categories(name) on update cascade,
  description text not null default '' check (char_length(description) <= 1000),
  price numeric(10,2) not null check (price >= 0),
  weight text not null default '250 g',
  image text not null,
  available boolean not null default true,
  stock integer not null default 24 check (stock >= 0),
  sku text not null default '',
  barcode text not null default '',
  long_description text not null default '',
  ingredients text not null default '',
  allergens text not null default '',
  shelf_life text not null default '',
  storage text not null default '',
  net_weight_grams integer not null default 250 check (net_weight_grams > 0),
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists stock integer not null default 24 check (stock >= 0);
alter table public.products add column if not exists sku text not null default '';
alter table public.products add column if not exists long_description text not null default '';
alter table public.products add column if not exists ingredients text not null default '';
alter table public.products add column if not exists allergens text not null default '';
alter table public.products add column if not exists shelf_life text not null default '';
alter table public.products add column if not exists storage text not null default '';
alter table public.products add column if not exists net_weight_grams integer not null default 250 check (net_weight_grams > 0);
alter table public.products add column if not exists created_at timestamptz not null default now();

alter table public.products enable row level security;

drop policy if exists "Admins manage products" on public.products;
drop policy if exists "Public reads available products" on public.products;
create policy "Public reads available products" on public.products
for select to anon, authenticated
using (available and exists (select 1 from public.categories c where c.name = category and c.enabled));

drop policy if exists "Product staff access" on public.products;
create policy "Product staff access" on public.products
for all to authenticated
using (public.has_tab('products'))
with check (public.has_tab('products'));

grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;

-- Seed default initial products
insert into public.products (name, category, description, price, weight, image, stock, available)
values
  ('Mango Pickle', 'Pickles', 'A little tang, a little spice, and a whole lot of nostalgia.', 180, '250 g', '/images/pickle.webp', 30, true),
  ('Traditional Chakkuli', 'Snacks', 'Golden, crisp spirals made for those just-one-more moments.', 160, '200 g', '/images/products/chakli.jpg', 25, true),
  ('Besan Laddoo', 'Sweets', 'Slow-roasted goodness, rolled into a little celebration.', 220, '250 g', '/images/products/besan-laddoo.jpg', 20, true),
  ('Homestyle Chutney Pudi', 'Pantry', 'Your everyday meals, with an extra spoonful of home.', 140, '200 g', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=85', 25, true),
  ('Sambar Powder', 'Pantry', 'A fragrant spice blend for comforting bowls of homestyle sambar.', 140, '200 g', '/images/products/sambar-powder.jpg', 25, true),
  ('Rava Ladoo', 'Sweets', 'A delicate, golden sweet for little celebrations and thoughtful gifting.', 220, '200 g', '/images/products/rava-ladoo.jpg', 18, true),
  ('Nippattu', 'Snacks', 'Crispy, savory bites that make tea time a little more special.', 160, '200 g', '/images/products/nippattu.jpg', 25, true)
on conflict do nothing;

-- =====================================================================
-- 4. BANNERS TABLE (HERO CAROUSEL & PROMOTIONS)
-- =====================================================================
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  tag text not null default 'THE SWAADHA FAMILY KITCHEN',
  title text not null check (char_length(title) between 1 and 150),
  em text not null default '',
  text text not null default '',
  image text not null,
  label text not null default '',
  href text not null default '/products',
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_banners_order on public.banners (display_order asc, created_at desc);

alter table public.banners enable row level security;

drop policy if exists "Public reads active banners" on public.banners;
create policy "Public reads active banners" on public.banners
for select to anon, authenticated
using (is_active = true or public.has_tab('banners'));

drop policy if exists "Staff can manage banners" on public.banners;
create policy "Staff can manage banners" on public.banners
for all to authenticated
using (public.has_tab('banners'))
with check (public.has_tab('banners'));

grant select on public.banners to anon;
grant select, insert, update, delete on public.banners to authenticated;

-- Seed default initial banners
insert into public.banners (tag, title, em, text, image, label, href, display_order, is_active)
values
  ('THE SWAADHA FAMILY KITCHEN', 'Rooted in tradition,', 'made with love.', 'Bringing authentic flavors and fresh ingredients from our family kitchen to yours.', '/images/hero.webp', 'Family favorites', '/products', 1, true),
  ('THE CELEBRATION COLLECTION', 'Little sweets,', 'lasting memories.', 'Beautifully packed laddoos for family gatherings, festive moments, and the people you love.', '/images/banner-sweets.jpg', 'Sweet celebrations', '/products?category=Sweets', 2, true),
  ('YOUR EVERYDAY RITUAL', 'A little crunch,', 'a lot of comfort.', 'Traditional Chakkuli and Nippattu. Familiar favorites for slow afternoons and a warm cup of tea.', '/images/banner-snacks.jpg', 'Tea-time favorites', '/products?category=Snacks', 3, true),
  ('A SPOONFUL OF HOME', 'Familiar spices,', 'unforgettable flavor.', 'From fragrant sambar powder to bold masalas. Bring a little of our kitchen into your everyday cooking.', '/images/banner-spices.jpg', 'The spice pantry', '/products?category=Pantry', 4, true)
on conflict do nothing;

-- =====================================================================
-- 5. COUPONS TABLE (DISCOUNT CODES & OFFERS)
-- =====================================================================
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (char_length(code) between 2 and 30),
  description text not null default '',
  discount_type text not null default 'percentage' check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  min_order_value numeric(10,2) not null default 0 check (min_order_value >= 0),
  max_discount numeric(10,2) check (max_discount is null or max_discount > 0),
  expiry_date timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  times_used integer not null default 0 check (times_used >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_coupons_code on public.coupons (upper(code));

alter table public.coupons enable row level security;

drop policy if exists "Public reads active coupons" on public.coupons;
create policy "Public reads active coupons" on public.coupons
for select to anon, authenticated
using (
  (is_active = true and (expiry_date is null or expiry_date > now()))
  or public.has_tab('coupons')
);

drop policy if exists "Staff can manage coupons" on public.coupons;
create policy "Staff can manage coupons" on public.coupons
for all to authenticated
using (public.has_tab('coupons'))
with check (public.has_tab('coupons'));

grant select on public.coupons to anon;
grant select, insert, update, delete on public.coupons to authenticated;

-- Seed default coupons
insert into public.coupons (code, description, discount_type, discount_value, min_order_value, max_discount, usage_limit, is_active)
values
  ('WELCOME10', '10% off on your first homemade order', 'percentage', 10, 300, 150, 1000, true),
  ('FESTIVE50', 'Flat ₹50 off on orders above ₹500', 'fixed', 50, 500, null, 500, true),
  ('SWEET20', '20% off on festive sweets & family packs', 'percentage', 20, 600, 200, 500, true)
on conflict (code) do nothing;

-- =====================================================================
-- 6. ORDERS TABLE
-- =====================================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null check (char_length(customer_name) between 1 and 100),
  phone text not null check (char_length(phone) between 8 and 20),
  address text not null check (char_length(address) between 10 and 1000),
  city text not null default '',
  state text not null default '',
  pincode text not null default '',
  email text not null default '',
  requested_date date not null,
  status text not null default 'pending' check (status in ('pending','confirmed','preparing','dispatched','delivered','cancelled')),
  total numeric(12,2) not null check (total >= 0),
  items jsonb not null,
  checkout_key uuid,
  inventory_reserved boolean not null default false,
  payment_method text not null default 'COD',
  payment_status text not null default 'unpaid',
  invoice_number text not null default '',
  coupon_code text default '',
  discount numeric(10,2) not null default 0,
  shiprocket_order_id bigint,
  shipment_id bigint,
  awb_code text,
  courier_name text,
  tracking_url text,
  shipping_state text,
  shipment_status text,
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists city text not null default '';
alter table public.orders add column if not exists state text not null default '';
alter table public.orders add column if not exists pincode text not null default '';
alter table public.orders add column if not exists email text not null default '';
alter table public.orders add column if not exists payment_method text not null default 'COD';
alter table public.orders add column if not exists payment_status text not null default 'unpaid';
alter table public.orders add column if not exists invoice_number text not null default '';
alter table public.orders add column if not exists checkout_key uuid;
alter table public.orders add column if not exists inventory_reserved boolean not null default false;
alter table public.orders add column if not exists coupon_code text default '';
alter table public.orders add column if not exists discount numeric(10,2) not null default 0;
alter table public.orders add column if not exists shiprocket_order_id bigint;
alter table public.orders add column if not exists shipment_id bigint;
alter table public.orders add column if not exists awb_code text;
alter table public.orders add column if not exists courier_name text;
alter table public.orders add column if not exists tracking_url text;
alter table public.orders add column if not exists shipping_state text;
alter table public.orders add column if not exists shipment_status text;

create index if not exists orders_customer_idx on public.orders (customer_id);
create index if not exists orders_created_idx on public.orders (created_at);
create unique index if not exists orders_checkout_key on public.orders (customer_id, checkout_key);

alter table public.orders enable row level security;

drop policy if exists "Read permitted orders" on public.orders;
create policy "Read permitted orders" on public.orders
for select to authenticated
using (customer_id = auth.uid() or public.has_tab('orders'));

revoke all on public.orders from anon;
grant select on public.orders to authenticated;
grant select, insert, update on public.orders to service_role;

-- =====================================================================
-- 7. STORAGE BUCKETS (banners, products, media)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('banners', 'banners', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']),
  ('products', 'products', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']),
  ('media', 'media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view images in public buckets" on storage.objects;
create policy "Public can view images in public buckets"
on storage.objects for select to public
using (bucket_id in ('banners', 'products', 'media'));

drop policy if exists "Admins can upload images" on storage.objects;
create policy "Admins can upload images"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('banners', 'products', 'media')
  and (
    exists (select 1 from public.admins where user_id = auth.uid())
    or auth.role() = 'service_role'
  )
);

drop policy if exists "Admins can update images" on storage.objects;
create policy "Admins can update images"
on storage.objects for update to authenticated
using (
  bucket_id in ('banners', 'products', 'media')
  and (
    exists (select 1 from public.admins where user_id = auth.uid())
    or auth.role() = 'service_role'
  )
);

drop policy if exists "Admins can delete images" on storage.objects;
create policy "Admins can delete images"
on storage.objects for delete to authenticated
using (
  bucket_id in ('banners', 'products', 'media')
  and (
    exists (select 1 from public.admins where user_id = auth.uid())
    or auth.role() = 'service_role'
  )
);

-- =====================================================================
-- 8. BUSINESS FUNCTIONS (RPC)
-- =====================================================================

-- 8a. Validate Coupon
create or replace function public.validate_coupon(p_code text, p_cart_total numeric)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_coupon public.coupons%rowtype;
  v_discount numeric := 0;
begin
  if p_code is null or trim(p_code) = '' then
    return jsonb_build_object('valid', false, 'message', 'Please enter a coupon code.');
  end if;

  select * into v_coupon from public.coupons
  where upper(code) = upper(trim(p_code)) and is_active = true;

  if not found then
    return jsonb_build_object('valid', false, 'message', 'Coupon code is invalid or inactive.');
  end if;

  if v_coupon.expiry_date is not null and v_coupon.expiry_date < now() then
    return jsonb_build_object('valid', false, 'message', 'This coupon has expired.');
  end if;

  if v_coupon.usage_limit is not null and v_coupon.times_used >= v_coupon.usage_limit then
    return jsonb_build_object('valid', false, 'message', 'Coupon usage limit has been reached.');
  end if;

  if p_cart_total < v_coupon.min_order_value then
    return jsonb_build_object(
      'valid', false,
      'message', format('Add items worth ₹%s more to use this coupon (min order ₹%s).',
        round(v_coupon.min_order_value - p_cart_total, 2),
        round(v_coupon.min_order_value, 2))
    );
  end if;

  if v_coupon.discount_type = 'percentage' then
    v_discount := round((p_cart_total * v_coupon.discount_value / 100), 2);
    if v_coupon.max_discount is not null and v_discount > v_coupon.max_discount then
      v_discount := v_coupon.max_discount;
    end if;
  else
    v_discount := least(v_coupon.discount_value, p_cart_total);
  end if;

  return jsonb_build_object(
    'valid', true,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'discount_amount', v_discount,
    'final_total', greatest(0, p_cart_total - v_discount),
    'message', format('Coupon %s applied! Saved ₹%s', v_coupon.code, v_discount)
  );
end $$;

revoke all on function public.validate_coupon(text, numeric) from public;
grant execute on function public.validate_coupon(text, numeric) to anon, authenticated;

-- 8b. Place Order
create or replace function public.place_order(
  p_name text,
  p_phone text,
  p_address text,
  p_city text,
  p_state text,
  p_pincode text,
  p_date date,
  p_items jsonb,
  p_checkout_key uuid,
  p_coupon_code text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  entry record;
  product public.products%rowtype;
  qty integer;
  subtotal numeric := 0;
  discount_amount numeric := 0;
  final_total numeric := 0;
  snapshot jsonb := '[]';
  new_id uuid;
  buyer_email text;
  v_coupon public.coupons%rowtype;
  clean_coupon text := upper(trim(coalesce(p_coupon_code, '')));
begin
  if auth.uid() is null then raise exception 'Sign in to place your order.'; end if;
  if p_checkout_key is null then raise exception 'Checkout key required.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_checkout_key::text,0));
  select id into new_id from public.orders where customer_id=auth.uid() and checkout_key=p_checkout_key;
  if found then return new_id; end if;
  if p_date is null or p_date<(now() at time zone 'Asia/Kolkata')::date+6 then raise exception 'Please allow 6-7 days for preparation.'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'Your cart is invalid.'; end if;
  if jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Choose 1 to 30 products.'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) x where (x->>'quantity') is null or (x->>'quantity') !~ '^[1-9][0-9]{0,2}$' or (x->>'product_id') is null) then raise exception 'Invalid quantity or product.'; end if;
  if trim(p_city)='' or char_length(p_city)>100 or trim(p_state)='' or char_length(p_state)>100 or p_pincode !~ '^[1-9][0-9]{5}$' or p_phone !~ '^[6-9][0-9]{9}$' then raise exception 'Enter a valid Indian delivery address, pincode and 10-digit mobile number.'; end if;
  select email into buyer_email from auth.users where id=auth.uid();

  for entry in select (x->>'product_id')::uuid product_id,sum((x->>'quantity')::integer)::integer quantity from jsonb_array_elements(p_items) x group by 1 order by 1 loop
    qty:=entry.quantity;
    if qty not between 1 and 100 then raise exception 'Quantity must be between 1 and 100 per product.'; end if;
    select * into product from public.products where id=entry.product_id for update;
    if not found or not product.available or not exists(select 1 from public.categories c where c.name=product.category and c.enabled) then raise exception 'A cart item is no longer available.'; end if;
    if product.stock<qty then raise exception 'Insufficient stock for %. Only % packs remain.',product.name,product.stock; end if;
    subtotal := subtotal + product.price * qty;
    snapshot := snapshot || jsonb_build_array(jsonb_build_object('product_id',product.id,'name',product.name,'sku',product.sku,'weight',product.weight,'net_weight_grams',product.net_weight_grams,'price',product.price,'quantity',qty));
    update public.products set stock=stock-qty where id=product.id;
  end loop;

  if clean_coupon <> '' then
    select * into v_coupon from public.coupons where upper(code) = clean_coupon and is_active = true for update;
    if found and (v_coupon.expiry_date is null or v_coupon.expiry_date > now()) and (v_coupon.usage_limit is null or v_coupon.times_used < v_coupon.usage_limit) and subtotal >= v_coupon.min_order_value then
      if v_coupon.discount_type = 'percentage' then
        discount_amount := round((subtotal * v_coupon.discount_value / 100), 2);
        if v_coupon.max_discount is not null and discount_amount > v_coupon.max_discount then
          discount_amount := v_coupon.max_discount;
        end if;
      else
        discount_amount := least(v_coupon.discount_value, subtotal);
      end if;
      update public.coupons set times_used = times_used + 1 where id = v_coupon.id;
    else
      clean_coupon := '';
      discount_amount := 0;
    end if;
  end if;

  final_total := greatest(0, subtotal - discount_amount);
  new_id := gen_random_uuid();
  insert into public.orders(
    id, customer_id, customer_name, phone, address, city, state, pincode, email, requested_date,
    total, items, checkout_key, inventory_reserved, payment_method, invoice_number, coupon_code, discount
  )
  values(
    new_id, auth.uid(), trim(p_name), p_phone, trim(p_address), trim(p_city), trim(p_state), p_pincode, buyer_email, p_date,
    final_total, snapshot, p_checkout_key, true, 'COD', 'SW-'||upper(replace(new_id::text,'-','')), clean_coupon, discount_amount
  );
  return new_id;
end $$;

revoke all on function public.place_order(text,text,text,text,text,text,date,jsonb,uuid,text) from public,anon;
grant execute on function public.place_order(text,text,text,text,text,text,date,jsonb,uuid,text) to authenticated;

-- Backwards compatibility 9-parameter overload
create or replace function public.place_order(
  p_name text,
  p_phone text,
  p_address text,
  p_city text,
  p_state text,
  p_pincode text,
  p_date date,
  p_items jsonb,
  p_checkout_key uuid
) returns uuid language sql security definer set search_path='' as $$
  select public.place_order(p_name, p_phone, p_address, p_city, p_state, p_pincode, p_date, p_items, p_checkout_key, null);
$$;
revoke all on function public.place_order(text,text,text,text,text,text,date,jsonb,uuid) from public,anon;
grant execute on function public.place_order(text,text,text,text,text,text,date,jsonb,uuid) to authenticated;

-- 8c. Set Order Status
create or replace function public.set_order_status(p_id uuid, p_status text) returns void language plpgsql security definer set search_path='' as $$
declare
  current_order public.orders%rowtype;
  item record;
begin
  if not public.has_tab('orders') then raise exception 'Order tab access required.'; end if;
  if p_status is null or p_status not in ('pending','confirmed','preparing','dispatched','delivered','cancelled') then raise exception 'Invalid status.'; end if;
  select * into current_order from public.orders where id=p_id for update;
  if not found then raise exception 'Order not found.'; end if;
  if current_order.status='cancelled' and p_status<>'cancelled' then raise exception 'Cancelled orders cannot be reopened.'; end if;
  if p_status='cancelled' and current_order.status<>'cancelled' then
    if current_order.status in ('dispatched','delivered') or current_order.shipping_state in ('creating','created','needs_review') then
      raise exception 'Resolve the shipment before cancelling this order.';
    end if;
    if current_order.inventory_reserved then
      for item in select (x->>'product_id')::uuid product_id,(x->>'quantity')::integer quantity from jsonb_array_elements(current_order.items) x order by 1 loop
        update public.products set stock=stock+item.quantity where id=item.product_id;
      end loop;
    end if;
  end if;
  update public.orders set status=p_status, inventory_reserved=case when p_status='cancelled' then false else inventory_reserved end where id=p_id;
end $$;

revoke all on function public.set_order_status(uuid,text) from public;
grant execute on function public.set_order_status(uuid,text) to authenticated;

-- 8d. Staff Management
create or replace function public.save_staff(p_email text, p_name text, p_permissions text[]) returns void language plpgsql security definer set search_path='' as $$
declare
  target_id uuid;
begin
  if not public.has_tab('team') then raise exception 'Owner access required.'; end if;
  if p_permissions is null or not (p_permissions <@ array['dashboard','pos','categories','products','banners','coupons','orders','reports']::text[]) then
    raise exception 'Invalid tab permissions.';
  end if;
  select id into target_id from auth.users where lower(email)=lower(trim(p_email));
  if target_id is null then raise exception 'Ask this person to create an account first, then grant access here.'; end if;
  if target_id=auth.uid() or exists(select 1 from public.admins where user_id=target_id and role='owner') then
    raise exception 'Owner permissions must be managed in the SQL editor.';
  end if;
  insert into public.admins(user_id,email,name,role,permissions)
  values(target_id,lower(trim(p_email)),left(trim(p_name),100),'staff',p_permissions)
  on conflict(user_id) do update set name=excluded.name,email=excluded.email,permissions=excluded.permissions;
end $$;

create or replace function public.revoke_staff(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.has_tab('team') then raise exception 'Owner access required.'; end if;
  delete from public.admins where user_id=p_id and role='staff';
  if not found then raise exception 'Staff member not found. Owners cannot be removed here.'; end if;
end $$;

revoke all on function public.save_staff(text,text,text[]), public.revoke_staff(uuid) from public;
grant execute on function public.save_staff(text,text,text[]), public.revoke_staff(uuid) to authenticated;

-- 8e. Analytics & Metrics
create or replace function public.admin_metrics(p_from date, p_to date) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  result jsonb;
begin
  if not(public.has_tab('dashboard') or public.has_tab('reports')) then raise exception 'Dashboard or report access required.'; end if;
  if p_from is null or p_to is null or p_from>p_to then raise exception 'Choose a valid date range.'; end if;
  with filtered as (
    select * from public.orders
    where (created_at at time zone 'Asia/Kolkata')::date between p_from and p_to
  ),
  daily as (
    select
      (created_at at time zone 'Asia/Kolkata')::date as report_date,
      count(*) as orders,
      coalesce(sum(total) filter(where status<>'cancelled'), 0) as total_val
    from filtered
    group by 1
    order by 1
  ),
  status_counts as (
    select status, count(*) as count
    from filtered
    group by status
  ),
  product_counts as (
    select
      item->>'name' as name,
      sum((item->>'quantity')::integer) as quantity,
      sum((item->>'quantity')::integer * (item->>'price')::numeric) as value
    from filtered
    cross join lateral jsonb_array_elements(items) as item
    where status<>'cancelled'
    group by 1
    order by 2 desc
    limit 10
  )
  select jsonb_build_object(
    'total_orders', (select count(*) from filtered),
    'pending', (select count(*) from filtered where status='pending'),
    'order_value', (select coalesce(sum(total),0) from filtered where status<>'cancelled'),
    'active_products', (select count(*) from public.products p join public.categories c on c.name=p.category where p.available and c.enabled),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', d.report_date, 'orders', d.orders, 'value', d.total_val)) from daily d), '[]'::jsonb),
    'by_status', coalesce((select jsonb_agg(jsonb_build_object('status', sc.status, 'count', sc.count)) from status_counts sc), '[]'::jsonb),
    'top_products', coalesce((select jsonb_agg(jsonb_build_object('name', pc.name, 'quantity', pc.quantity, 'value', pc.value)) from product_counts pc), '[]'::jsonb)
  ) into result;

  return result;
end $$;

revoke all on function public.admin_metrics(date,date) from public;
grant execute on function public.admin_metrics(date,date) to authenticated;

-- 8f. Claim Shipment (for Shiprocket)
create or replace function public.claim_shipment(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
  update public.orders set shipping_state='creating' where id=p_id and status in ('confirmed','preparing') and shiprocket_order_id is null and (shipping_state is null or shipping_state='failed');
  return found;
end $$;

revoke all on function public.claim_shipment(uuid) from public,anon,authenticated;
grant execute on function public.claim_shipment(uuid) to service_role;

commit;
