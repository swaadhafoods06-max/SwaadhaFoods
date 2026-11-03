BEGIN;
CREATE OR REPLACE FUNCTION public.has_tab(tab_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
SELECT EXISTS(SELECT 1 FROM public.admins a WHERE a.user_id=auth.uid() AND (a.role='owner' OR (tab_name IN ('dashboard','pos','categories','products','banners','coupons','orders','reports','payments') AND tab_name=ANY(a.permissions))));
$$;
REVOKE ALL ON FUNCTION public.has_tab(text) FROM public;
GRANT EXECUTE ON FUNCTION public.has_tab(text) TO anon,authenticated;

CREATE TABLE IF NOT EXISTS public.payment_settings (
 id integer PRIMARY KEY CHECK (id=1), provider text NOT NULL DEFAULT 'Google Pay' CHECK(provider IN ('Google Pay','PhonePe','Other UPI app')),
 phone text NOT NULL DEFAULT '',payee_name text NOT NULL DEFAULT '',qr_image text NOT NULL DEFAULT '',enabled boolean NOT NULL DEFAULT false,updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(NOT enabled OR (length(trim(phone))>=10 AND length(trim(payee_name))>0 AND qr_image ~ '^https://'))
);
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_settings_read ON public.payment_settings;
CREATE POLICY payment_settings_read ON public.payment_settings FOR SELECT TO anon,authenticated USING(enabled OR public.has_tab('payments'));
DROP POLICY IF EXISTS payment_settings_write ON public.payment_settings;
CREATE POLICY payment_settings_write ON public.payment_settings FOR ALL TO authenticated USING(public.has_tab('payments')) WITH CHECK(public.has_tab('payments'));
GRANT SELECT ON public.payment_settings TO anon,authenticated;
GRANT INSERT,UPDATE,DELETE ON public.payment_settings TO authenticated;
INSERT INTO public.payment_settings(id) VALUES(1) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('payment-qr','payment-qr',true,5242880,ARRAY['image/png','image/jpeg','image/webp']) ON CONFLICT(id) DO NOTHING;
DROP POLICY IF EXISTS payment_qr_read ON storage.objects;
CREATE POLICY payment_qr_read ON storage.objects FOR SELECT TO anon,authenticated USING(bucket_id='payment-qr');
DROP POLICY IF EXISTS payment_qr_insert ON storage.objects;
CREATE POLICY payment_qr_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='payment-qr' AND public.has_tab('payments'));
COMMIT;

create or replace function public.save_staff(p_email text, p_name text, p_permissions text[]) returns void language plpgsql security definer set search_path='' as $$
declare
  target_id uuid;
begin
  if not public.has_tab('team') then raise exception 'Owner access required.'; end if;
  if p_permissions is null or not (p_permissions <@ array['dashboard','pos','categories','products','banners','coupons','orders','reports','payments']::text[]) then
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

NOTIFY pgrst, 'reload schema';
