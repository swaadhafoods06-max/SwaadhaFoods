-- 012: let the kitchen mark an order's QR payment as verified (paid) or rejected
-- after checking the customer's screenshot against the bank / UPI app.
begin;

create or replace function public.set_payment_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not (public.has_tab('orders') or public.has_tab('payments')) then raise exception 'Order or payment tab access required.'; end if;
  if p_status is null or p_status not in ('unpaid','paid','rejected') then raise exception 'Invalid payment status.'; end if;
  update public.orders set payment_status=p_status where id=p_id;
  if not found then raise exception 'Order not found.'; end if;
end $$;

revoke all on function public.set_payment_status(uuid,text) from public,anon;
grant execute on function public.set_payment_status(uuid,text) to authenticated;

commit;
notify pgrst,'reload schema';
