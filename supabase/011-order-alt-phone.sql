-- 011: alternative phone number on orders.
-- Adds orders.alt_phone and lets place_order accept an optional p_alt_phone.
-- The old 10-argument version is replaced (dropped) so the call is not ambiguous;
-- the 9-argument backwards-compatible overload from 004 is left untouched.
begin;

alter table public.orders add column if not exists alt_phone text;

drop function if exists public.place_order(text,text,text,text,text,text,date,jsonb,uuid,text);

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
  p_coupon_code text default null,
  p_alt_phone text default null
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
  clean_alt text := nullif(regexp_replace(coalesce(p_alt_phone, ''), '\D', '', 'g'), '');
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
  if clean_alt is not null and clean_alt !~ '^[6-9][0-9]{9}$' then raise exception 'Enter a valid 10-digit alternative mobile number.'; end if;
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
    id, customer_id, customer_name, phone, alt_phone, address, city, state, pincode, email, requested_date,
    total, items, checkout_key, inventory_reserved, payment_method, invoice_number, coupon_code, discount
  )
  values(
    new_id, auth.uid(), trim(p_name), p_phone, clean_alt, trim(p_address), trim(p_city), trim(p_state), p_pincode, buyer_email, p_date,
    final_total, snapshot, p_checkout_key, true, 'UPI', 'SW-'||upper(replace(new_id::text,'-','')), clean_coupon, discount_amount
  );
  return new_id;
end $$;

revoke all on function public.place_order(text,text,text,text,text,text,date,jsonb,uuid,text,text) from public,anon;
grant execute on function public.place_order(text,text,text,text,text,text,date,jsonb,uuid,text,text) to authenticated;

commit;
