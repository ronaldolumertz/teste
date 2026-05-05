-- Migration 008 — Logomarca da empresa
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public read company logos"  ON storage.objects;
DROP POLICY IF EXISTS "owner upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "owner delete company logos" ON storage.objects;

CREATE POLICY "public read company logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-logos');

CREATE POLICY "owner upload company logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-logos' AND my_role() = 'owner');

CREATE POLICY "owner delete company logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'company-logos' AND my_role() = 'owner');

NOTIFY pgrst, 'reload schema';
