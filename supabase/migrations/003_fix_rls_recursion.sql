-- ═══════════════════════════════════════════════════════════
-- Migration 003 — Corrige recursão infinita no RLS
-- Rodar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Função SECURITY DEFINER que consulta columns sem ativar RLS
-- (quebra o loop: columns → column_permissions → columns)
CREATE OR REPLACE FUNCTION public.column_in_my_company(p_column_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.columns c
    JOIN public.profiles p ON p.company_id = c.company_id
    WHERE c.id = p_column_id AND p.id = auth.uid()
  )
$$;

-- Recriar política sem referência circular
DROP POLICY IF EXISTS "admin manage permissions" ON public.column_permissions;
CREATE POLICY "admin manage permissions" ON public.column_permissions FOR ALL TO authenticated
  USING (my_role() IN ('owner','admin') AND column_in_my_company(column_id))
  WITH CHECK (my_role() IN ('owner','admin') AND column_in_my_company(column_id));
