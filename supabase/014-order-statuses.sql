-- Run in Supabase SQL Editor before selecting Refunded in the admin panel.
-- 'preparing' remains the stored value for Not yet dispatched.
begin;
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in ('pending','confirmed','preparing','dispatched','delivered','cancelled','refunded'));
create or replace function public.set_order_status(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare current_order public.orders%rowtype; item record;
begin
 if not public.has_tab('orders') then raise exception 'Order tab access required.'; end if;
 if p_status is null or p_status not in ('pending','confirmed','preparing','dispatched','delivered','cancelled','refunded') then raise exception 'Invalid status.'; end if;
 select * into current_order from public.orders where id=p_id for update;
 if not found then raise exception 'Order not found.'; end if;
 if (current_order.status='cancelled' and p_status not in ('cancelled','refunded')) or (current_order.status='refunded' and p_status<>'refunded') then raise exception 'Cancelled or refunded orders cannot be reopened. Place a new order.'; end if;
 if p_status='cancelled' and current_order.status not in ('cancelled','refunded') then
  if current_order.status in ('dispatched','delivered') or current_order.shipping_state in ('creating','created','needs_review') then raise exception 'Resolve the shipment before cancelling this order.'; end if;
  if current_order.inventory_reserved then
   for item in select (x->>'product_id')::uuid product_id,(x->>'quantity')::integer quantity from jsonb_array_elements(current_order.items) x order by 1 loop
    update public.products set stock=stock+item.quantity where id=item.product_id;
   end loop;
  end if;
 end if;
 update public.orders set status=p_status,inventory_reserved=case when p_status='cancelled' then false else inventory_reserved end where id=p_id;
end $$;

commit;
