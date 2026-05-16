-- ═══════════════════════════════════════════════════════════
-- Migration 020 — Cor de empresa no banco + upload de ícone
-- Rodar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Coluna accent_color em companies (persiste a cor no banco)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS accent_color text;

-- 2. Permitir que owner/admin atualizem accent_color da própria empresa
CREATE POLICY IF NOT EXISTS "members_update_accent"
  ON public.companies
  FOR UPDATE
  TO authenticated
  USING    (id = my_company_id())
  WITH CHECK (id = my_company_id());

-- 3. Atualizar get_app_settings para incluir app_icon_url
CREATE OR REPLACE FUNCTION public.get_app_settings()
RETURNS json LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT json_object_agg(key, value)
     FROM public.system_settings
     WHERE key IN ('default_accent', 'app_icon_url')),
    '{}'::json
  )
$$;
GRANT EXECUTE ON FUNCTION public.get_app_settings() TO anon, authenticated;

-- 4. RPC para resetar cor de TODAS as empresas (somente super admin)
CREATE OR REPLACE FUNCTION public.reset_all_company_accents()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT (SELECT is_superadmin FROM public.profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  UPDATE public.companies SET accent_color = NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reset_all_company_accents() TO authenticated;

-- 5. Bucket público para assets do app (ícone, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-assets', 'app-assets', true,
  2097152,
  ARRAY['image/png','image/jpeg','image/svg+xml','image/webp','image/gif','image/x-icon']
)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='app_assets_public_read'
  ) THEN
    EXECUTE 'CREATE POLICY app_assets_public_read ON storage.objects FOR SELECT USING (bucket_id = ''app-assets'')';
  END IF;
END $$;

-- Upload autenticado
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='app_assets_auth_write'
  ) THEN
    EXECUTE 'CREATE POLICY app_assets_auth_write ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = ''app-assets'')';
  END IF;
END $$;

-- Delete autenticado
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='app_assets_auth_delete'
  ) THEN
    EXECUTE 'CREATE POLICY app_assets_auth_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = ''app-assets'')';
  END IF;
END $$;
