-- ═══════════════════════════════════════════════════════════
-- Migration 019 — Configurações públicas do app (anon)
-- Rodar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════
--
-- Expõe um subset seguro de system_settings para leitura anônima.
-- Usado nas páginas de login/registro para aplicar a cor padrão
-- antes do usuário autenticar.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_app_settings()
RETURNS json LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT json_object_agg(key, value)
     FROM public.system_settings
     WHERE key IN ('default_accent')),
    '{}'::json
  )
$$;

GRANT EXECUTE ON FUNCTION public.get_app_settings() TO anon, authenticated;
