-- =====================================================================
-- SWAADHA KITCHEN — MIGRATION 006
-- Allow sub-admins to be given the POS Billing tab
-- =====================================================================

begin;

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

revoke all on function public.save_staff(text,text,text[]) from public;
grant execute on function public.save_staff(text,text,text[]) to authenticated;

commit;
