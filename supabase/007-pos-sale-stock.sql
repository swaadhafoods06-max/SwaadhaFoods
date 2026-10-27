-- =====================================================================
-- SWAADHA KITCHEN — MIGRATION 007
-- POS sales: record the sale and reduce stock together, in one step
-- =====================================================================
-- The POS screen used to insert the order and update stock from the browser. Staff can't insert
-- orders directly, and the stock update was skipped for cashiers without the Products tab and could
-- overwrite stock changed by an online order. This function does both safely, like place_order.

begin;

create or replace function public.record_pos_sale(
  p_customer_name text,
  p_phone text,
  p_payment_method text,
  p_discount numeric,
  p_items jsonb
) returns public.orders language plpgsql security definer set search_path='' as $$
declare
  entry record;
  product public.products%rowtype;
  subtotal numeric := 0;
  discount_amount numeric;
  snapshot jsonb := '[]';
  new_id uuid := gen_random_uuid();
  clean_name text := left(coalesce(nullif(trim(p_customer_name), ''), 'Counter Customer'), 100);
  clean_phone text := coalesce(nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g'), ''), '0000000000');
  sale public.orders%rowtype;
begin
  if not public.has_tab('pos') then raise exception 'POS Billing access required.'; end if;
  if p_payment_method is null or p_payment_method not in ('Cash','UPI','Card','Pay Later') then raise exception 'Choose a payment method.'; end if;
  if char_length(clean_phone) not between 8 and 20 then raise exception 'Enter a valid mobile number, or leave it empty.'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Add 1 to 100 products to the bill.'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) x where (x->>'quantity') is null or (x->>'quantity') !~ '^[1-9][0-9]{0,2}$' or (x->>'product_id') is null) then
    raise exception 'Invalid quantity or product in the bill.';
  end if;

  -- Rows are locked in id order, so two sales at once can't deadlock or both take the last pack.
  for entry in select (x->>'product_id')::uuid product_id, sum((x->>'quantity')::integer)::integer quantity from jsonb_array_elements(p_items) x group by 1 order by 1 loop
    select * into product from public.products where id=entry.product_id for update;
    if not found then raise exception 'A product in the bill no longer exists.'; end if;
    if product.stock < entry.quantity then
      raise exception 'Not enough stock for %. Only % left.', product.name, product.stock;
    end if;
    subtotal := subtotal + product.price * entry.quantity;
    snapshot := snapshot || jsonb_build_array(jsonb_build_object('product_id',product.id,'name',product.name,'sku',product.sku,'weight',product.weight,'net_weight_grams',product.net_weight_grams,'price',product.price,'quantity',entry.quantity));
    update public.products set stock=stock-entry.quantity where id=product.id;
  end loop;

  discount_amount := least(greatest(coalesce(p_discount, 0), 0), subtotal);
  insert into public.orders(
    id, customer_name, phone, address, requested_date, status, total, items, inventory_reserved,
    payment_method, payment_status, invoice_number, discount
  )
  values(
    new_id, clean_name, clean_phone, 'Kitchen Counter / In-Store POS', (now() at time zone 'Asia/Kolkata')::date, 'delivered',
    subtotal - discount_amount, snapshot, true,
    'POS ('||p_payment_method||')', case when p_payment_method='Pay Later' then 'unpaid' else 'paid' end,
    'POS-'||to_char(now() at time zone 'Asia/Kolkata','YYMMDD')||'-'||upper(substr(replace(new_id::text,'-',''),1,6)),
    discount_amount
  )
  returning * into sale;
  return sale;
end $$;

revoke all on function public.record_pos_sale(text,text,text,numeric,jsonb) from public, anon;
grant execute on function public.record_pos_sale(text,text,text,numeric,jsonb) to authenticated;

commit;
