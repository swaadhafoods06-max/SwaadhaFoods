-- Run after the existing setup / migrations. Responsive admin layouts need no SQL.
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS mobile_image text NOT NULL DEFAULT '';
COMMENT ON COLUMN public.banners.mobile_image IS 'Optional mobile-specific banner URL; desktop image is used when empty. Uses existing banners bucket and policies.';
NOTIFY pgrst, 'reload schema';
